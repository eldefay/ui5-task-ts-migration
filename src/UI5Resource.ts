
import {addSyntheticTrailingComment, createPrinter, createProgram, NewLineKind, SyntaxKind, SourceFile, EmitHint, CallExpression, FunctionExpression, ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression, Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression, HeritageClause, ClassElement, Statement, TypeParameterDeclaration, ScriptTarget, ScriptKind, createSourceFile, ModuleKind, factory, ModifierFlags, Node, ImportDeclaration, ClassDeclaration, ConstructorDeclaration, NamedImportBindings, ImportSpecifier, NamedImports} from 'typescript';
import jsonata from "jsonata";
import { ASTService } from './ASTService';

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
    sourceFile: SourceFile;
    importDeclarations: ImportDeclaration[] = [];
    info?: { imports: [[string, string]]; classes: ClassInfo[]; otherExpressions: Statement[]; };
    classDeclarations: any;
    static ui5Types: { [key: string]: SourceFile } = {};
    constructor(public path: string, public projectPath: string) {
        this.sourceFile = ASTService.getAST(this.path);
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
        let extendAsts = jsonata("arguments[1].body.statements[declarationList.declarations[0].initializer.expression.name.text='extend' or expression.expression.name.text='extend']").evaluate(ui5DefineAst),
            extendDeclarations : Statement[] = extendAsts ? (extendAsts.length > 1 ? extendAsts : [extendAsts]) : null,
            classInfos = extendDeclarations?.map(this.getUI5ClassInfo) as ClassInfo[] || [],
            otherExpressions = (ui5DefineAst.arguments[1] as FunctionExpression).body.statements.filter(n => !extendDeclarations?.includes(n))
            
            classInfos?.forEach(classInfo => {
                let classMethods = jsonata("$[expression.left.expression.name.text='prototype' and expression.left.expression.expression.text='" + classInfo.className + "'].expression[]")
                    .evaluate(otherExpressions)?.map((d:any) => [d.left.name.text, d.right]) as [string, FunctionExpression][];

                otherExpressions = otherExpressions?.filter(d => !classMethods?.map(([_, statement]) => statement as any)?.includes(((d as ExpressionStatement)?.expression as BinaryExpression)?.right));
                
                // TODO cleanup super calls, replace .. prototype...apply(this, arguments) => super arguments
                classInfo.methods = classInfo.methods?.concat(classMethods || []);
            });

            // Opa5.createPageObjects
            // TODO: check whether conversion needed for tests & how to run them afterwards
            let createPageObjectsAsts = jsonata("arguments[1].body.statements[expression.expression.expression.text='Opa5']").evaluate(ui5DefineAst);

        return {
            imports: jsonata("$zip(arguments[1].[parameters.name.text], arguments[0].[elements.text])").evaluate(ui5DefineAst) as [[string,string]],
            classes: classInfos,
            otherExpressions: otherExpressions
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
                superCallSelector = jsonata(`body.statements[expression.kind=${SyntaxKind.CallExpression} 
                    and expression.expression.expression.name.text='${name}'
                    and expression.expression.expression.expression.name.text='prototype'
                    and expression.expression.expression.expression.expression.text='${classInfo.superClassName}']`),
                superCall = superCallSelector.evaluate(methodExpression),
                newBody = transformedMethod.body,
                superImport = jsonata(`$[importClause.name.text='${classInfo.superClassName}' or importClause.namedBindings.elements.name.text='${classInfo.superClassName}']`).evaluate(this.importDeclarations) as ImportDeclaration,
                nameBinding = jsonata(`importClause[name.text='${classInfo.superClassName}' or namedBindings.elements[name.text='${classInfo.superClassName}']]`).evaluate(superImport) as ImportSpecifier,
                path = (superImport?.moduleSpecifier as any).text || "",
                pathParts: string[] = path.split("/") || [],
                superNameSpace = path?.split("/").splice(0, pathParts.length - 1).join("."),
                cInfo = superCall && superNameSpace.substr(0, 3) == "sap" ? this.getSuperConstructorInfo(path, nameBinding?.propertyName?.text || path.split("/").pop()) : undefined;
        
            if (superCall) {
                
                if( superNameSpace == "sap.m" && cInfo ) {
                    cInfo?.missingImports?.map( ({path: _path, name: name}) => factory.updateImportClause(superImport.importClause!, false, superImport.importClause!.name,
                        
                        factory.createNamedImports([...((superImport.importClause?.namedBindings as any)?.elements || []),
                        factory.createImportSpecifier(
                            undefined,
                            factory.createIdentifier(name))
                        ])
                    ))
                }


                let newSuperCall = factory.createExpressionStatement(
                    factory.createCallExpression(factory.createSuper(), undefined, undefined ||
                        cInfo?.parameters.map(paramDeclaration => factory.createIdentifier((paramDeclaration.name as any).text))));
                newBody = factory.createBlock(transformedMethod.body.statements.map( statement => statement == superCall ? newSuperCall : statement), true);
            }

            let newMethod = name == "init" ? 
                factory.createConstructorDeclaration(
                    undefined,
                    undefined,
                    cInfo?.parameters || methodExpression.parameters,
                    newBody
                ) :
                factory.createMethodDeclaration(
                    undefined,
                    name.substr(0,1) != "_" ? undefined : factory.createModifiersFromModifierFlags( ModifierFlags.Private ),
                    undefined,
                    name,
                    undefined,
                    methodExpression.typeParameters,
                    methodExpression.parameters,
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

    addNewLineComment(node: Node) {
        addSyntheticTrailingComment(node, SyntaxKind.SingleLineCommentTrivia, " compiler: new line", true);
        addSyntheticTrailingComment(node, SyntaxKind.SingleLineCommentTrivia, " compiler: new line", true);
    }

    removeNewLineComments(source: string) {
        return source.replace(/\/\/ compiler: new line/g,"")
    }

    async migrateUI5SourceFileFromES5() : Promise<string> {

        let ui5DefineStatement = this.getUI5Define(),
            declarationsBlock;
        if( !ui5DefineStatement ) {
            declarationsBlock = factory.createBlock(this.sourceFile.statements);
        } else {
            this.info = this.getUI5Definitions(ui5DefineStatement);
            this.importDeclarations = this.info.imports.map(([name, path]) => factory.createImportDeclaration(
                    undefined, //[] as ts.Decorator[],
                    undefined, // [] as ts.Modifier[],
                    factory.createImportClause(false, 
                            path.substr(0, 1) == "." ? undefined: factory.createIdentifier(name),
                            path.substr(0, 1) != "." ?
                                undefined :
                                // TODO add missing imports here
                                factory.createNamedImports([factory.createImportSpecifier(
                                    path.substr(path.lastIndexOf("/") + 1) == name ? undefined :factory.createIdentifier(path.substr(path.lastIndexOf("/") + 1)),
                                    factory.createIdentifier(name))])
                    ),
                    factory.createStringLiteral(path))
                );
            this.classDeclarations = this.info.classes.map(classInfo => this.getClassDeclaration(classInfo));
            let lastImport = this.importDeclarations[this.importDeclarations.length - 1]
            if(lastImport) {
                this.addNewLineComment(lastImport)
            }
            declarationsBlock = factory.createBlock(([] as Statement[]).concat(this.importDeclarations).concat(this.classDeclarations).concat(this.info.otherExpressions || []) as Statement[]);
        }

        let newContent = declarationsBlock.statements.flatMap(s => s).map(s => ASTService.print(s)).join("\n");

        newContent = this.removeNewLineComments(newContent);
        
        console.log("transformed", this.path);
        return newContent;
    }

    static getTypeLibAst(projectPath: string, importPath: string) {
        if( importPath.substr(0, 3) == "sap" ) {
            let nameSpace = importPath.substr(0, importPath.matchAll(/[A-Z]/g).next().value.index - 1).replace(/\//g, "."),
                path = projectPath + '/node_modules/@types/openui5/' + nameSpace + '.d.ts';
            if( !this.ui5Types[nameSpace] ) {
                this.ui5Types[nameSpace] = ASTService.getAST(path);
            }
            let parentTypeLibAst = jsonata(`statements[name.text='${importPath}']`).evaluate(this.ui5Types[nameSpace]) as Statement;

            return parentTypeLibAst
        }
        return undefined;
    }

    getTypeAst(importPath: string, className: string) {

        let parentTypeLibAst = UI5Resource.getTypeLibAst(this.projectPath, importPath),
        ParentClassAst = jsonata(`body.statements[name.text = '${className}']`)
            .evaluate(parentTypeLibAst) as ClassDeclaration;
        
        return ParentClassAst
    }

    getSuperConstructorInfo(importPath: string, className: string) {
        let parentClassTypeAst = this.getTypeAst(importPath, className);
        if(!parentClassTypeAst) {
            return undefined
        };
        let constructorAst = jsonata(`members[kind=${SyntaxKind.Constructor}]`)
            .evaluate(parentClassTypeAst)[1] as ConstructorDeclaration,
        parameterTypeNames = jsonata(`[parameters.type.typeName.text]`).evaluate(constructorAst) as string[],
        missingImports = parameterTypeNames
            .filter(name => this.getTypeAst(importPath, name))
            .map(name => ({path: importPath, name: name}));

        return {
            parameters: constructorAst.parameters,
            missingImports: missingImports
        };
    }
}