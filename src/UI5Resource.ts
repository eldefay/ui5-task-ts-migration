
import {TypeNode, NodeArray, SyntaxKind, SourceFile, CallExpression, FunctionExpression,
    ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression,
    Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression,
    Statement, factory, ModifierFlags, ImportDeclaration, ClassDeclaration, ConstructorDeclaration,
    ParameterDeclaration, NamedImports, ReturnStatement, MethodDeclaration} from 'typescript';
import jsonata from "jsonata";
import { ASTService } from './ASTService';
import { UI5MigrationProject } from './UI5MigrationProject';

export type ClassInfo = {
    jsDocs: any,
    className : string,
    nameSpace : string,
    superClassName : string,
    ui5ClassSettings : {[key: string]: Expression},
    constructorAst?: any,
    methods?: [string, FunctionExpression][]
};

export class UI5Resource {
    static ARGS = "args";
    static ui5Types: { [key: string]: SourceFile } = {};
    sourceFile?: SourceFile;
    info?: {
        imports: { [k: string]: string[] };
        classes: ClassInfo[];
        otherExpressions: Statement[];
    };
    classDeclarations: ClassDeclaration[] = [];
    missingImports: {
        path: string;
        name: string;
    }[] = [];
    constructor(public path: string, public project: UI5MigrationProject) {
        
    }

    getUI5Define() : CallExpression {
        // find single sap.ui.define
        // TODO check whether multiple definition are allowed in a file
        //      check whether define call can be embedded
        return jsonata(`statements[
            expression.expression.expression.expression.escapedText='sap' and
            expression.expression.expression.name.escapedText='ui' and
            expression.expression.name.escapedText='define'].expression`).evaluate(this.sourceFile) as CallExpression
    }
 
    getUI5Definitions(ui5DefineAst: CallExpression) {
        let defineCallBody = (ui5DefineAst.arguments[1] as FunctionExpression).body,
            returnStatement = jsonata(`statements[kind=${SyntaxKind.ReturnStatement}]`).evaluate(defineCallBody) as ReturnStatement,
            useStrictStatement = jsonata(`statements[expression.text='use strict']`).evaluate(defineCallBody) as ExpressionStatement,
            mainExportName = (returnStatement?.expression as any)?.text as string,
            extendDeclarations = jsonata("[arguments[1].body.statements[declarationList.declarations[0].initializer.expression.name.text='extend' or expression.expression.name.text='extend']]").evaluate(ui5DefineAst),
            classInfos = extendDeclarations?.map(this.getUI5ClassInfo.bind(this)) as ClassInfo[] || [],
            otherExpressions = (ui5DefineAst.arguments[1] as FunctionExpression).body.statements
                .filter(s => ![...extendDeclarations || [], useStrictStatement, returnStatement]?.includes(s));
            
            classInfos?.forEach(classInfo => {
                let classMethods = jsonata("$[expression.left.expression.name.text='prototype' and expression.left.expression.expression.text='" + classInfo.className + "'].expression[]")
                    .evaluate(otherExpressions)?.map((d:any) => [d.left.name.text, d.right]) as [string, FunctionExpression][];

                otherExpressions = otherExpressions?.filter(d => !classMethods?.map(([_, statement]) => statement as any)?.includes(((d as ExpressionStatement)?.expression as BinaryExpression)?.right));
                classInfo.methods = [...classInfo.methods ?? [], ...classMethods ?? []];
            });

            // Opa5.createPageObjects
            // TODO: check whether conversion needed for tests & how to run them afterwards
            let createPageObjectsAsts = jsonata("arguments[1].body.statements[expression.expression.expression.text='Opa5']").evaluate(ui5DefineAst);

        return {
            imports: Object.fromEntries(
                (jsonata("$zip([arguments[0].[elements.text]], [arguments[1].parameters.name.text])")
                .evaluate(ui5DefineAst) as [[string,string]])
                .map(x => ([x[0],[x[1]]]) )
            ),
            classes: classInfos,
            otherExpressions: otherExpressions,
            exportName: mainExportName
        }
    }

    getUI5ClassInfo(extendAst: any) : ClassInfo {
        let jsDocs = extendAst.jsDoc,
            classDeclaration = extendAst.declarationList?.declarations[0] as VariableDeclaration,
            extendCall = (classDeclaration?.initializer || extendAst.expression) as CallExpression,
            classNameInSpace = (extendCall.arguments[0] as StringLiteral).text,
            className = (classDeclaration?.name as any)?.text || classNameInSpace.substr(classNameInSpace.lastIndexOf(".") + 1 ),
            nameSpace = classNameInSpace.substr(0, classNameInSpace.lastIndexOf(".")),
            superClassName = ((extendCall.expression as PropertyAccessExpression).expression as Identifier).text,
            extendSettings = (extendCall.arguments[1] as ObjectLiteralExpression)?.properties?.map(p =>
                [(p.name as Identifier).text, (p as PropertyAssignment).initializer || p]) as [string, Expression][],
            ui5ClassSettings = Object.fromEntries(extendSettings?.filter(([_name, exp]) => exp.kind != SyntaxKind.FunctionExpression) || []),
            methods = extendSettings?.filter(([_name, exp]) => exp.kind == SyntaxKind.FunctionExpression) as [string, FunctionExpression][];
        return {
            jsDocs: jsDocs,
            className : className,
            nameSpace : nameSpace,
            superClassName : superClassName,
            ui5ClassSettings : ui5ClassSettings,
            methods: methods
        }
    }

    getClassDeclaration(classInfo: ClassInfo) {
        let metaAST = classInfo.ui5ClassSettings.metadata as ObjectLiteralExpression,
            metaDataProperty = !metaAST ? undefined : factory.createPropertyDeclaration(
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
        newMethods = (classInfo.methods || []).map(([name, methodExpression]) => {
            // console.log(ui5Api);

            let transformedMethod = methodExpression,
                // TODO support "return superCall;"
                superCallSelector = jsonata(`body.statements[expression.kind=${SyntaxKind.CallExpression} 
                    and expression.expression.expression.name.text='${name}'
                    and expression.expression.expression.expression.name.text='prototype'
                    and expression.expression.expression.expression.expression.text='${classInfo.superClassName}']`),
                superCall = superCallSelector.evaluate(methodExpression),
                newBody = transformedMethod.body,
                path = Object.entries(this.info!.imports).filter(([_path, names]) => names.includes(classInfo.superClassName))[0][0] || "",
                pathParts: string[] = path.split("/") || [],
                superNameSpace = path?.split("/").splice(0, pathParts.length - 1).join("."),
                cInfo = superNameSpace.substr(0, 3) == "sap" ? this.getSuperMethodInfo(path, path.split("/").pop() || path, name) : undefined;
        
            if (superCall) {
                if( cInfo ) {
                    this.missingImports = [...this.missingImports, ...cInfo.missingImports]
                }
                let newSuperCall = factory.createExpressionStatement(
                    factory.createCallExpression(
                        name=="init" ? factory.createSuper() : factory.createPropertyAccessExpression(
                            factory.createSuper(), factory.createIdentifier(name)
                        ),
                        undefined,
                        (cInfo?.parameters?.length || 0) > 0
                            ? cInfo?.parameters?.map(paramDeclaration => factory.createIdentifier((paramDeclaration.name as any).text))
                            : [factory.createSpreadElement(factory.createIdentifier(UI5Resource.ARGS))]
                    ));
                newBody = factory.createBlock(transformedMethod.body.statements.map( statement => statement == superCall ? newSuperCall : statement), true);
            }

            let newParameters = cInfo?.parameters ||
                (methodExpression.parameters?.length > 0 ? methodExpression.parameters : [
                    factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        factory.createToken(SyntaxKind.DotDotDotToken),
                        UI5Resource.ARGS,
                        undefined,
                        factory.createKeywordTypeNode(SyntaxKind.AnyKeyword),
                        undefined)]);

            let newMethod = name == "init" ? 
                factory.createConstructorDeclaration(
                    undefined,
                    undefined,
                    newParameters,
                    newBody
                ) :
                factory.createMethodDeclaration(
                    undefined,
                    name.substr(0,1) != "_" ? undefined : factory.createModifiersFromModifierFlags( ModifierFlags.Private ),
                    undefined,
                    name,
                    undefined,
                    methodExpression.typeParameters,
                    newParameters,
                    undefined,
                    newBody
                );
                return newMethod;
            }
        ),
        elements = metaDataProperty ? [metaDataProperty, ...newMethods] : newMethods;
        return factory.createClassDeclaration(
            undefined,
            [factory.createModifier(SyntaxKind.ExportKeyword)],
            factory.createIdentifier(classInfo.className),
            undefined, // as TypeParameterDeclaration[],
            [
                factory.createHeritageClause( SyntaxKind.ExtendsKeyword,
                    [factory.createExpressionWithTypeArguments(factory.createIdentifier(classInfo.superClassName), /*typeArguments*/ undefined)]
                )
            ],
            elements);
    }

    createImports() {

        this.missingImports.flatMap(r => r).forEach((missingImport) => {
            let importsForPath = this.info!.imports[missingImport.path];
            this.info!.imports[missingImport.path] = [...new Set([...(importsForPath || []), missingImport.name])];
        })
        
        let importDeclarations = Object.entries(this.info?.imports || {}).map(([path, names]) => factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(false, 
                // path.substr(0, 1) != "." ? undefined : factory.createIdentifier(names[0]), // Local ts is generated & has 1 export
                factory.createIdentifier(names[0]), // Local ts is generated & has 1 export
                this.info!.imports[path]?.length < 2 ? undefined : factory.createNamedImports(
                    this.info!.imports[path].filter((_,i) => i > 0).map(name => 
                        factory.createImportSpecifier(undefined, factory.createIdentifier(name)))
                )
            ),
            factory.createStringLiteral(path))
        );
        return importDeclarations;
    }

    analyse() {
        this.sourceFile = this.project.program?.getSourceFile(this.path)
        // this.sourceFile = ASTService.getAST(this.path);
        let ui5DefineStatement = this.getUI5Define();
        if(ui5DefineStatement) {
            this.info = this.getUI5Definitions(ui5DefineStatement);
            this.classDeclarations = this.info?.classes.map(classInfo => this.getClassDeclaration(classInfo));
            // missing imports are gathered in line above    
        }
    }

    getTypescriptContent() {
        // missing imports are gathered in this.analyse
        let importDecelerations = this.createImports();
        try {
            let declarationsBlock = factory.createBlock(
                ([] as Statement[])
                    .concat(importDecelerations)
                    .concat(this.classDeclarations)
                    .concat(this.info?.otherExpressions || [])
                || this.sourceFile?.statements)
            let newContent = declarationsBlock.statements.flatMap(s => s).map(s => ASTService.print(s)).join("\n");
            return newContent;
        } catch (e) {
            console.error(e);
        }
        return undefined;
    }

    static getTypeLibAst(projectPath: string, importPath: string) {
        if( importPath.substr(0, 3) == "sap" ) {
            if( importPath == "sap/ui/thirdparty/jquery" ) {
                importPath = "jquery";
            }
            let nameSpace = importPath.substr(0, importPath.matchAll(/[A-Z]/g).next().value?.index - 1).replace(/\//g, "."),
                path = projectPath + '/node_modules/@types/openui5/' + nameSpace + '.d.ts';
            if( !this.ui5Types[nameSpace] ) {
                this.ui5Types[nameSpace] = ASTService.getAST(path) || this.ui5Types["sap.ui.core"];
            }
            let parentTypeLibAst = jsonata(`statements[name.text='${importPath}']`).evaluate(this.ui5Types[nameSpace]) as Statement;

            return parentTypeLibAst
        } else if( importPath.substr(0, 1) == "." ) {
            // TODO Enable traversing local classes
        }
        return undefined;
    }

    getImportInfo(importPath: string, className: string) : {
        importPath: string,
        classAst: ClassDeclaration
    } {
        // CompilerHost.resolveModuleNames(moduleNames: string[], containingFile: string)
        // this.project!.compilerHost!.resolveModuleNames([], this.sourceFile?.getFullText() || "",)
        // TODO: use resolveModuleNames instead of own impl.
        this.project?.compilerHost?.resolveModuleNames?.([], "", undefined, undefined, {})
        let librarySourceFile = UI5Resource.getTypeLibAst(this.project.workspacePath||this.project.path, importPath),
        classAst = jsonata(`body.statements[name.text = '${className}']`)
            .evaluate(librarySourceFile) as ClassDeclaration;

        if(!classAst) {
            // console.log(`class "${className}" not found in "${importPath}", will search in imports`);
            let imports = jsonata(`[body.statements[kind=${SyntaxKind.ImportDeclaration}]]`).evaluate(librarySourceFile) as ImportDeclaration[],
                superImport = imports.find(id =>  id.importClause?.name?.text == className ||
                    (id.importClause?.namedBindings as NamedImports)?.elements.find(nbe => nbe.name.text == className));
                
            let externalImportPath = (superImport?.moduleSpecifier as any)?.text;
                if(externalImportPath) {
                    return this.getImportInfo(externalImportPath, className);
                } else {
                    console.warn(`cant find import reference for Type ${className}  in ${importPath}`)
                }
        };
        
        return {
            importPath: importPath,
            classAst: classAst
        }
    }

    getSuperMethodInfo(importPath: string, className: string, methodName = "init") : {
        missingImports: {
            path: string;
            name: string;
        }[],
        parameters: NodeArray<ParameterDeclaration>,
        type: TypeNode | undefined
    } | undefined {
        let isConstructor = methodName == "init",
            {
                importPath: missingImportPath,
                classAst: classAst
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
                // TODO filter for types in other name spaces 
                .filter(name => this.getImportInfo(importPath, name))
                .map(name => ({path: missingImportPath, name: name})); // TODO: import path is wrong here, it should be mapped or extracted,it's only true for

        return {
            missingImports: missingImports,
            parameters: (superMethodAst as MethodDeclaration || simpleConstructor)?.parameters,
            type: (superMethodAst as MethodDeclaration || simpleConstructor)?.type // TODO: add missing import for return type
        };
    }
}