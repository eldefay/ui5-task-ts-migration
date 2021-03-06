
import ts, {TypeNode, NodeArray, SyntaxKind, SourceFile, CallExpression, FunctionExpression,
    ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression,
    Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression,
    Statement, factory, ModifierFlags, ImportDeclaration, ClassDeclaration, ConstructorDeclaration,
    ParameterDeclaration, NamedImports, ReturnStatement, MethodDeclaration, Node, NewExpression, FunctionDeclaration, ArrowFunction, Block, VariableStatement, VariableDeclarationList, JSDoc, addSyntheticLeadingComment, ModuleDeclaration} from 'typescript';
import jsonata from 'jsonata';
import { ASTService } from './ASTService';
import { UI5MigrationProject } from './UI5MigrationProject';
import { resolve } from 'path';

type ImportInfo = {
    path: string;
    name: string;
    isDefaultImport?: Boolean
}

type TypedVar<T> = VariableStatement & {
    declarationList: VariableDeclarationList & {
        declarations: NodeArray<VariableDeclaration & {
            initializer?: T
        }>
    }
}

type ObjectVar = TypedVar<ObjectLiteralExpression|NewExpression>;
type FunctionVar = TypedVar<FunctionExpression>;

type MemberInfo = {
    name: string,
    body: Expression,
    isStatic: boolean
};

type MethodInfo = MemberInfo & {
    body: FunctionExpression | ArrowFunction
};

type ClassInfoBase = {
    jsDoc?: JSDoc,
    className : string,
    constructorFE?: FunctionExpression | ArrowFunction,
    methods?: MethodInfo[],
    staticMethods?: MethodInfo[]
    staticProperties?: MemberInfo[]
}
type ClassInfo = ClassInfoBase & {
    nameSpace : string,
    superClassName : string,
    ui5ClassSettings : {[key: string]: Expression}
}
type SingletonInfo = ClassInfoBase &¬†{
};

type FileInfo = {
    imports: { [k: string]: ImportInfo[] };
    classes: (ClassInfo |¬†SingletonInfo)[];
    otherExpressions: Statement[];
}

export class UI5Resource {
    static ARGS = "args";
    static ui5Types: { [key: string]: SourceFile } = {};
    sourceFile?: SourceFile;
    info?: FileInfo;
    classDeclarations: ClassDeclaration[] = [];
    missingImports: ImportInfo[] = [];
    constructor(public path: string, public project: UI5MigrationProject) {
        
    }

    getUI5DefineCalls() : CallExpression[] {
        // find sap.ui.define calls
        // TODO check whether define call can be embedded
        return jsonata(`[statements[
            expression.expression.expression.expression.escapedText='sap' and
            expression.expression.expression.name.escapedText='ui' and
            expression.expression.name.escapedText='define'].expression]`).evaluate(this.sourceFile) as CallExpression[]
    }
 
    getUI5Definitions(ui5DefineAst: CallExpression) {
        let defineCallBody = ((ui5DefineAst.arguments[1] ?? ui5DefineAst.arguments[0]) as FunctionExpression).body,
            returnStatement = jsonata(`statements[kind=${SyntaxKind.ReturnStatement}]`).evaluate(defineCallBody) as ReturnStatement,
            useStrictStatement = jsonata(`statements[expression.text='use strict']`).evaluate(defineCallBody) as ExpressionStatement,
            mainExportName = (returnStatement?.expression as any)?.text as string,
            jsDoc = (jsonata(`statements[declarationList.declarations[name.text="${mainExportName}"]].jsDoc`).evaluate(defineCallBody) ?? [])[0] as JSDoc | undefined,
            classObjectVar = jsonata(`statements[
                declarationList.declarations.name.text='${mainExportName}' and  (
                    declarationList.declarations[0].initializer.kind=${SyntaxKind.NewExpression} or
                    declarationList.declarations[0].initializer.kind=${SyntaxKind.ObjectLiteralExpression})]`).evaluate(defineCallBody) as ObjectVar,
            exportedFunctionVar: FunctionVar|undefined = jsonata(`statements[declarationList.declarations.name.text='${mainExportName}' and declarationList.declarations[0].initializer.kind=${SyntaxKind.FunctionExpression}]`).evaluate(defineCallBody) as FunctionVar,
            classObject = classObjectVar?.declarationList.declarations[0],
            extendDeclarations = jsonata("[statements[declarationList.declarations[0].initializer.expression.name.text='extend' or expression.expression.name.text='extend']]").evaluate(defineCallBody) ?? [],
            classInfos: (ClassInfo |¬†SingletonInfo)[] = extendDeclarations.map(this.getUI5ClassInfo.bind(this)) ||¬†[],

            // singletons
            singletonBody = classObject?.initializer?.kind == SyntaxKind.ObjectLiteralExpression ?
                classObject?.initializer as ObjectLiteralExpression : 
                    (((classObject?.initializer as NewExpression)?.expression as Identifier)?.text == "Object" ? 
                        factory.createObjectLiteralExpression()
                    : undefined),
            
            otherExpressions = [...defineCallBody?.statements ?? []];

        if (exportedFunctionVar && jsDoc?.tags?.find(tag => tag.tagName.text == "class")) {
            let classFunction = exportedFunctionVar?.declarationList.declarations[0]?.initializer
            if(classFunction) {
                classInfos.push({
                    jsDoc: jsDoc,
                    className : mainExportName,
                    constructorFE: classFunction
                })
            }
        } else {
            // TODO export function
            exportedFunctionVar = undefined;
        }

        if(singletonBody) {
            let singletonStaticProperties: MemberInfo[] = [],
            singletonStaticMethods: MethodInfo[] = [];
            
            [...singletonBody.properties ??¬†[]]
            .filter(propertyAssignment => propertyAssignment != null)
            .map(propRaw => propRaw as PropertyAssignment)
            .forEach(propertyAssignment => {
                let name = (propertyAssignment.name as Identifier).text,
                    body = propertyAssignment.initializer;
                if([SyntaxKind.FunctionExpression, SyntaxKind.ArrowFunction].includes(body.kind))¬†{
                    singletonStaticMethods.push({
                        name: name,
                        body: body as FunctionExpression | ArrowFunction,
                        isStatic: true
                    });
                } else {
                    singletonStaticProperties.push({
                        name: name,
                        body: body as Expression,
                        isStatic: true
                    });
                }
            });
            classInfos.push({
                // isSingleton: true;
                jsDoc: jsDoc,
                className : mainExportName,
                staticMethods: singletonStaticMethods,
                staticProperties: singletonStaticProperties
            });
        }
        otherExpressions = otherExpressions.filter(s => ![...extendDeclarations ||¬†[], useStrictStatement, classObjectVar, exportedFunctionVar, returnStatement]?.includes(s));

        classInfos?.forEach(classInfo => {

            let methods = (jsonata(`$[
                    expression.left.expression.name.text='prototype'
                and expression.left.expression.expression.text='${classInfo.className}'
                and (
                        expression.right.kind=${SyntaxKind.FunctionExpression}
                    or expression.right.kind=${SyntaxKind.ArrowFunction})
            ].expression[]`).evaluate(otherExpressions) as BinaryExpression[])?.map((bExp) => {
                otherExpressions = otherExpressions.filter(s => bExp != (s as ExpressionStatement)?.expression);
                return {
                    name: (bExp.left as PropertyAccessExpression)?.name.text,
                    body: bExp.right as FunctionExpression | ArrowFunction,
                    isStatic: false
                } as MethodInfo;
            }),

            [staticMethods, staticProperties] = (jsonata(`$[
                expression.left.expression.text='${classInfo.className}'
        ].expression[]`).evaluate(otherExpressions) ?? []).reduce((acc: [MethodInfo[], MemberInfo[]], bExp: BinaryExpression) => {
                otherExpressions = otherExpressions.filter(s => bExp != (s as ExpressionStatement)?.expression);
                let memberInfo: MemberInfo = {
                    name: (bExp.left as PropertyAccessExpression)?.name.text,
                    body: bExp.right,
                    isStatic: true
                };
                switch(bExp.right.kind) {
                    case SyntaxKind.ArrowFunction:
                    case SyntaxKind.FunctionExpression: {
                        acc[0].push(memberInfo as MethodInfo);
                        break;
                    }
                    default: {
                        acc[1].push(memberInfo as MemberInfo);
                    }
                }
            return acc;
        }, [[],[]]);

            classInfo.methods = [...classInfo.methods ??¬†[], ...methods ?? []];
            classInfo.staticMethods = [...classInfo.staticMethods ??¬†[], ...staticMethods ?? []];
            classInfo.staticProperties = [...classInfo.staticProperties ??¬†[], ...staticProperties ?? []];
            // TODO add support anonymous self-executing functions to private members
        });
        // Opa5.createPageObjects
        // TODO: check whether conversion needed for tests & how to run them afterwards
        let createPageObjectsAsts = jsonata("statements[expression.expression.expression.text='Opa5']").evaluate(defineCallBody);

        return {
            imports: Object.fromEntries(
                (jsonata("$zip([arguments[0].[elements.text]], [arguments[1].parameters.name.text])")
                .evaluate(ui5DefineAst) as [[string,string]])
                .map(x => ([x[0],[{
                    name: x[1],
                    path: x[0],
                    isDefaultImport: true
                }]]) )
            ),
            classes: classInfos,
            otherExpressions: otherExpressions,
            exportName: mainExportName
        }
    }

    getUI5ClassInfo(extendAst: any) : ClassInfo {
        let jsDoc = extendAst.jsDoc[0],
            classDeclaration = extendAst.declarationList?.declarations[0] as VariableDeclaration,
            extendCall = (classDeclaration?.initializer ||¬†extendAst.expression) as CallExpression,
            classNameInSpace = (extendCall.arguments[0] as StringLiteral).text,
            className = (classDeclaration?.name as any)?.text || classNameInSpace.substr(classNameInSpace.lastIndexOf(".") + 1 ),
            nameSpace = classNameInSpace?.substr(0, classNameInSpace.lastIndexOf(".")),
            superClassName = ((extendCall.expression as PropertyAccessExpression).expression as Identifier).text,
            extendSettings = (extendCall.arguments[1] as ObjectLiteralExpression)?.properties?.map(p =>
                [(p.name as Identifier).text, (p as PropertyAssignment).initializer || p]) as [string, Expression][],
            ui5ClassSettings = Object.fromEntries(extendSettings?.filter(([_name, exp]) => exp.kind != SyntaxKind.FunctionExpression) || []),
            methods = extendSettings?.filter(([_name, exp]) => exp.kind == SyntaxKind.FunctionExpression) ?? [] as [string, FunctionExpression][];
        return {
            jsDoc: jsDoc,
            className : className,
            nameSpace : nameSpace,
            superClassName : superClassName,
            ui5ClassSettings : ui5ClassSettings,
            methods: methods.map(([name, body]) => ({
                name: name,
                body: body as ArrowFunction | FunctionExpression,
                isStatic: false
            }))
        }
    }

    getClassDeclaration(classInfo: ClassInfo | SingletonInfo) {

        let metaAST = (classInfo as ClassInfo)?.ui5ClassSettings?.metadata as ObjectLiteralExpression
        let metaDataProperty = !metaAST ? undefined : factory.createPropertyDeclaration(
            undefined,
            [
                factory.createModifier(SyntaxKind.PublicKeyword),
                factory.createModifier(SyntaxKind.StaticKeyword)
            ],
            factory.createIdentifier("metadata"),
            undefined,
            undefined,
            factory.createObjectLiteralExpression(metaAST?.properties, false)
        ),
        superClassName = (classInfo as ClassInfo)?.superClassName,
        heritageClauses = superClassName ?
            [
                factory.createHeritageClause( SyntaxKind.ExtendsKeyword,
                    [factory.createExpressionWithTypeArguments(factory.createIdentifier(superClassName), /*typeArguments*/ undefined)]
                )
            ] : [],
        newMethods = ([... [], ...(classInfo as ClassInfo)?.methods ??¬†[],
                                ...classInfo.staticMethods ?? [],
                                ...(classInfo.constructorFE ? [{name: "constructor", body: classInfo.constructorFE, isStatic: false}] : [])
                            ])
                                .map(({name, body, isStatic}) => {
            
            let newBody = (body as FunctionExpression).body?.statements ?
                      (body as FunctionExpression).body :
                      factory.createBlock([factory.createReturnStatement((body as ArrowFunction).body as Expression)] ?? []),
            newParameters = ((body?.parameters?.length ?? 0) > 0 ? 
                body?.parameters.map(oP => factory.createParameterDeclaration(
                    oP.decorators,
                    oP.modifiers,
                    oP.dotDotDotToken,
                    oP.name,
                    oP.questionToken,
                    oP.type || factory.createKeywordTypeNode(SyntaxKind.AnyKeyword), // TODO detect type from name
                    oP.initializer)) :
                [factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createToken(SyntaxKind.DotDotDotToken),
                    UI5Resource.ARGS,
                    undefined,
                    factory.createKeywordTypeNode(SyntaxKind.AnyKeyword),
                    undefined)]);

            if ( (classInfo as ClassInfo).superClassName ) {
                let ui5ClassInfo = classInfo as ClassInfo,
                // TODO support "return superCall;"
                superCallSelector = jsonata(`body.statements[expression.kind=${SyntaxKind.CallExpression} 
                    and expression.expression.expression.name.text='${name}'
                    and expression.expression.expression.expression.name.text='prototype'
                    and expression.expression.expression.expression.expression.text='${ui5ClassInfo.superClassName}']`),
                superCall = superCallSelector.evaluate(body),
                path = Object.entries(this.info!.imports)
                    .find(([_path, imports]) => imports
                        .find(iImport => iImport.name.includes(ui5ClassInfo.superClassName)))?.[0] ?? "",
                pathParts: string[] = path.split("/") || [],
                superNameSpace = path?.split("/").splice(0, pathParts.length - 1).join("."),
                cInfo = this.getSuperMethodInfo(path, path.split("/").pop() || path, name);

                if (superCall) {
                    if( cInfo && cInfo.missingImports?.length > 0 ) {
                        this.missingImports = [...this.missingImports, ...cInfo.missingImports]
                    }
                    let newSuperCall = factory.createExpressionStatement(
                        factory.createCallExpression(
                            name=="init" ? factory.createSuper() : factory.createPropertyAccessExpression(
                                factory.createSuper(), factory.createIdentifier(name)
                            ),
                            undefined,
                            (cInfo?.parameters?.length ||¬†0) > 0
                                ? cInfo?.parameters?.map(paramDeclaration => factory.createIdentifier((paramDeclaration.name as any).text))
                                : [factory.createSpreadElement(factory.createIdentifier(UI5Resource.ARGS))]
                        ));
                    newBody = factory.createBlock(newBody.statements.map( statement => statement == superCall ? newSuperCall : statement), true);
                }
    
                newParameters = [...cInfo?.parameters || newParameters];
            }
            
            let flags: ModifierFlags = ModifierFlags.None;
            if( name.substr(0,1) == "_" ) {
                flags = flags | ModifierFlags.Private;
            }
            if(isStatic) {
                flags = flags | ModifierFlags.Static;
            }
            
            let newMethod = name == "init" && (classInfo as ClassInfo)?.superClassName ?
                // init is converted to constructor for sub-classes
                factory.createConstructorDeclaration(
                    undefined,
                    undefined,
                    newParameters,
                    newBody
                ) :
                factory.createMethodDeclaration(
                    undefined,
                    factory.createModifiersFromModifierFlags(flags),
                    undefined,
                    name,
                    undefined,
                    body.typeParameters,
                    newParameters,
                    undefined,
                    newBody
                );
                return newMethod;
            }
        ),
        newProperties = ([... [], ...classInfo.staticProperties ?? []]).map(({name, body: initializer, isStatic}) => {
            let flags: ModifierFlags = ModifierFlags.None;
            if( name.substr(0,1) == "_" ) {
                flags |= ModifierFlags.Private;
            }
            if( isStatic ) {
                flags |= ModifierFlags.Static;
            }
            return factory.createPropertyDeclaration(undefined, factory.createModifiersFromModifierFlags(flags), name, undefined, undefined, initializer);
        }),
        elements = [...newProperties, ...newMethods];
        if( metaDataProperty ) {
            elements.unshift(metaDataProperty);
        }
        let classDeclaration = factory.createClassDeclaration(
            undefined,
            [   factory.createModifier(SyntaxKind.ExportKeyword),
                factory.createModifier(SyntaxKind.DefaultKeyword)],
            factory.createIdentifier(classInfo.className),
            undefined, // as TypeParameterDeclaration[],
            heritageClauses,
            elements);
        
        if (classInfo.jsDoc) {
            const jsDocString = ASTService.print(classInfo.jsDoc, this.sourceFile).trim().replace(/^\/\*(\*)/, "").replace(/\*\/$/, "");
            addSyntheticLeadingComment(classDeclaration, SyntaxKind.MultiLineCommentTrivia, jsDocString, /*hasTrailingNewLine*/ true);
        }
        return classDeclaration
    }

    createImports() {

        this.missingImports.flatMap(r => r).forEach((missingImport) => {
            let importsForPath = this.info!.imports[missingImport.path] ?? [];
            this.info!.imports[missingImport.path] = [...new Set([...importsForPath, missingImport])];
        })
        
        let importDeclarations = Object.entries(this.info?.imports || {})
            .map(([path, importInfos]) => {
                let defaultImport = importInfos.find(iImportInfo => path.split("/").pop() == iImportInfo.name ||¬†iImportInfo.isDefaultImport)?.name,
                    namedImports = this.info!.imports[path].filter(iImportInfo => iImportInfo.name !=  defaultImport).map(iImportInfo => iImportInfo.name)

                return factory.createImportDeclaration(
                    undefined,
                    undefined,
                    factory.createImportClause(false, 
                        defaultImport ? factory.createIdentifier(defaultImport) : undefined,
                        namedImports?.length > 0 ? factory.createNamedImports(
                            namedImports.map(namedImport => 
                                factory.createImportSpecifier(undefined, factory.createIdentifier(namedImport)))
                        ) : undefined
                    ),
                    factory.createStringLiteral(path))
                });
        return importDeclarations;
    }

    analyse() {
        this.sourceFile = this.project.program?.getSourceFile(this.path)
        // this.sourceFile = ASTService.getAST(this.path);
        let ui5DefineCalls = this.getUI5DefineCalls();
        
        this.info = ui5DefineCalls.map(this.getUI5Definitions.bind(this)).reduce<FileInfo>((acc, info) => ({...acc, ...info}), {} as FileInfo)
        // this.info = this.getUI5Definitions(ui5DefineCalls);
        // missing imports are gathered in this.getClassDeclaration
        this.classDeclarations = this.info?.classes?.map(classInfo => this.getClassDeclaration(classInfo));
        console.log("analysed " + this.path);
    }

    getTypescriptContent() {
        // missing imports are gathered in this.analyse
        let importDecelerations = this.createImports();
        try {
            let declarationsBlock = factory.createBlock(
                ([] as Statement[])
                    .concat(importDecelerations)
                    .concat(this.classDeclarations)
                    .concat(this.info?.otherExpressions ||¬†[])
                || this.sourceFile?.statements),
                newContent = declarationsBlock.statements.flatMap(s => s).map(s => ASTService.print(s, this.sourceFile)).join("\n");
            return newContent;
        } catch (e) {
            console.error(e);
        }
        return undefined;
    }

    static getTypeLibAst(projectPath: string, importPath: string, sourcePath: string) {
        if( importPath.substr(0, 3) == "sap" ) {
            if( importPath == "sap/ui/thirdparty/jquery" ) {
                importPath = "jquery";
            }
            let nameSpace = importPath.substr(0, importPath.matchAll(/[A-Z]/g).next().value?.index - 1).replace(/\//g, "."),
                path = projectPath + '/node_modules/@types/openui5/' + nameSpace + '.d.ts';
            if( !this.ui5Types[nameSpace] ) {
                this.ui5Types[nameSpace] = ASTService.getAST(path) ||¬†this.ui5Types["sap.ui.core"];
            }
            let parentTypeLibAst = jsonata(`statements[name.text='${importPath}']`).evaluate(this.ui5Types[nameSpace]) as Statement;

            return parentTypeLibAst
        } else if( importPath.substr(0, 1) == "." ) {
            let absoluteImportPath = resolve(sourcePath, "../", importPath) + ".ts";
            return ASTService.getAST(absoluteImportPath);
        } else {
            console.warn(`unhandled import path ${importPath}`);
        }
        return undefined;
    }

    getImportInfo(importPath: string, importID: string) : {
        importPath: string,
        classAst: ClassDeclaration
        isDefaultImport?: Boolean
    } {
        // TODO: use program.getTypeChecker().getSymbolAtLocation instead of own impl.
        let librarySourceFile = UI5Resource.getTypeLibAst(this.project.workspacePath ?? this.project.path, importPath, this.path),
        classAst = (jsonata(`body.statements[name.text = '${importID}']`)
                        .evaluate(librarySourceFile) ??
                    jsonata(`statements[name.text='${importID}' or name.text='${importID.split(".")[0]}']`)
                        .evaluate(librarySourceFile)) as ClassDeclaration;

        if(!classAst) {
            // console.log(`class "${className}" not found in "${importPath}", will search in imports`);
            let imports = (jsonata(`[body.statements[kind=${SyntaxKind.ImportDeclaration}]]`).evaluate(librarySourceFile) as [])
                            .concat(jsonata(`[statements[kind=${SyntaxKind.ImportDeclaration}]]`).evaluate(librarySourceFile)) as ImportDeclaration[],
                superImport = imports.find(id => id.importClause?.name?.text == importID),
                isDefaultImport = true;
            
            if (superImport == null) {
                superImport = imports.find(id => 
                    (id.importClause?.namedBindings as NamedImports)?.elements
                        .find(nbe => nbe.name.text == importID));

                isDefaultImport = false;
            }
                
            let externalImportPath = (superImport?.moduleSpecifier as any)?.text;
            if(externalImportPath) {
                return {...this.getImportInfo(externalImportPath, importID), ...{isDefaultImport: isDefaultImport}};
            } else {
                console.warn(`cant find import reference for Type ${importID}  in ${importPath}`)
            }
        };
        
        return {
            importPath: importPath,
            classAst: classAst
        }
    }

    getSuperMethodInfo(importPath: string, className: string, methodName = "init") : {
        missingImports: ImportInfo[],
        parameters: NodeArray<ParameterDeclaration>,
        type?: TypeNode
    } | undefined {
        if (importPath.substr(0, 3) == "sap" || importPath.substr(0, 1) == ".") {
            console.log(importPath);
        }
        let isConstructor = methodName == "init",
            {
                importPath: missingImportPath,
                classAst: classAst,
                isDefaultImport: isDefaultImport
            } = this.getImportInfo(importPath, className);

        let superMethodAst      =  isConstructor ? undefined : jsonata(`[members[name.text='${methodName}']]`).evaluate(classAst)[0],
            superConstructors   = !isConstructor ? undefined : jsonata(`[members[kind=${SyntaxKind.Constructor}]]`).evaluate(classAst) as ConstructorDeclaration[];

        if(!superMethodAst && !superConstructors && classAst) {
            let superParentClassName = (classAst.heritageClauses?.find(c => c.token == SyntaxKind.ExtendsKeyword)?.types[0].expression as any)?.text,
                superMethodInfo = !superParentClassName ? undefined : this.getSuperMethodInfo(importPath, superParentClassName, methodName);
            return superMethodInfo;
        }

        let simpleConstructor = superConstructors?.sort((a, b) => a.parameters.length - b.parameters.length)[0],
            parameterTypeNames = jsonata(`[parameters.type.typeName.text]`).evaluate(superMethodAst || simpleConstructor) as string[],
            missingImports = parameterTypeNames
                .map(name => ({name: name, importInfo: this.getImportInfo(importPath, name)}))
                .map(typeInfo => ({name: typeInfo.name, path: typeInfo?.importInfo.importPath ?? missingImportPath, isDefaultImport: typeInfo?.importInfo.isDefaultImport}));
        return {
            missingImports: missingImports,
            parameters: (superMethodAst as MethodDeclaration || simpleConstructor)?.parameters,
            type: (superMethodAst as MethodDeclaration || simpleConstructor)?.type // TODO: add missing import for return type
        };
    }
}