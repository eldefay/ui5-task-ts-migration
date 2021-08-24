
import {createPrinter, createProgram, NewLineKind, SyntaxKind, SourceFile, EmitHint, CallExpression, FunctionExpression, ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression, Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression, HeritageClause, ClassElement, Statement, TypeParameterDeclaration, ScriptTarget, ScriptKind, createSourceFile, ModuleKind} from 'typescript';
import * as jsonata from "jsonata";

import { LeftHandSideExpression, Project, ts } from "ts-morph";

export type ClassInfo = {
    jsDocs: any,
    className : string,
    nameSpace : string,
    superClassName : string,
    ui5ClassSettings : [[ string , Expression ]],
    constructorAst?: any,
    methods?: [string, FunctionExpression][]
};

export class ASTService {
	
    static getAST(jsFilePath: string, content?: string) : SourceFile {
        return content != null ? ts.createSourceFile(
            jsFilePath,                  // filePath
            content, // fileText 
            ts.ScriptTarget.ES2020,     // scriptTarget
            true                        // setParentNodes -- sets the `parent` property
        ) : createProgram([jsFilePath], {
            allowJs: true,
            module: ModuleKind.ES2020
        }).getSourceFile(jsFilePath) as SourceFile;
    }

    static getUI5Define(sourceFileAst: SourceFile) : CallExpression {
        // find single sap.ui.define
        // TODO check whether multiple definition are allowed in a file
        //      check whether define call can be embedded
        return jsonata(`statements[
            expression.expression.expression.expression.escapedText='sap' and
            expression.expression.expression.name.escapedText='ui' and
            expression.expression.name.escapedText='define'].expression`).evaluate(sourceFileAst) as CallExpression
    }
 
    static getUI5Definitions(ui5DefineAst: CallExpression) {
        let extendAsts = jsonata("arguments[1].body.statements[declarationList.declarations[0].initializer.expression.name.text='extend']").evaluate(ui5DefineAst),
            extendDeclarations : Statement[] = extendAsts ? (extendAsts.length > 1 ? extendAsts : [extendAsts]) : null,
            classInfos = extendDeclarations?.map(this.getUI5ClassInfo) as ClassInfo[] || [],
            otherExpressions = (ui5DefineAst.arguments[1] as FunctionExpression).body.statements.filter(n => !extendDeclarations?.includes(n))
            
            classInfos?.forEach(classInfo => {
                let classMethods = jsonata("$[expression.left.expression.name.text='prototype' and expression.left.expression.expression.text='" + classInfo.className + "'].expression[]")
                    .evaluate(otherExpressions)?.map((d:any) => [d.left.name.text, d.right]) as [string, FunctionExpression][];

                otherExpressions = otherExpressions?.filter(d => !classMethods?.map(([_, statement]) => statement as any)?.includes(((d as ExpressionStatement)?.expression as BinaryExpression)?.right));
                
                // TODO cleanup super calls, replace .. prototype...apply(this, arguments) => super arguments
                classInfo.methods = classMethods;
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

    static getUI5ClassInfo(extendAst: any) : ClassInfo {
        let jsDocs = extendAst.jsDoc,
            classDeclaration = extendAst.declarationList.declarations[0] as VariableDeclaration,
            className = (classDeclaration.name as Identifier).text,
            extendCall = classDeclaration.initializer as CallExpression,
            classNameInSpace = (extendCall.arguments[0] as StringLiteral).text,
            nameSpace = classNameInSpace.substr(0, classNameInSpace.lastIndexOf("." + className )),
            superClassName = ((extendCall.expression as PropertyAccessExpression).expression as Identifier).text,
            ui5ClassSettings = (extendCall.arguments[1] as ObjectLiteralExpression)?.properties?.map(p =>
                [(p.name as Identifier).text, (p as PropertyAssignment).initializer]) as [[ string , Expression ]];
            
        return {
            jsDocs: jsDocs,
            className : className,
            nameSpace : nameSpace,
            superClassName : superClassName,
            ui5ClassSettings : ui5ClassSettings
        }
    }

    static getClassDeclaration(classInfo: ClassInfo) {
        return ts.factory.createClassDeclaration(
            undefined, // [] as ts.Decorator[],
            undefined, // [] as ts.Modifier[],
            ts.factory.createIdentifier(classInfo.className),
            undefined, // as TypeParameterDeclaration[],
            [
                ts.factory.createHeritageClause(
                    SyntaxKind.ExtendsKeyword,
                    [
                        ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(classInfo.superClassName), /*typeArguments*/ undefined)
                    ]
                )
            ] as HeritageClause[],
            (classInfo.methods || []).map(([name, methodExpression]) => name == "init" ? 
                ts.factory.createConstructorDeclaration(
                    undefined,
                    ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Public),
                    methodExpression.parameters,
                    methodExpression.body
                ) :
                ts.factory.createMethodDeclaration(
                    undefined,
                    ts.factory.createModifiersFromModifierFlags(name.substr(0,1) != "_" ? ts.ModifierFlags.Public : ts.ModifierFlags.Private),
                    undefined,
                    name,
                    undefined,
                    methodExpression.typeParameters,
                    methodExpression.parameters,
                    undefined,
                    methodExpression.body
                )
            ));
    }
    
    static migrateUI5SourceFileFromES5(path: string, content?: string) : string {

        let lastPathSeparatorIndex = path.lastIndexOf("/"),
            fileName    = path.substring(lastPathSeparatorIndex + 1, path.lastIndexOf(".")),
            dirPath     = path.substring(0, lastPathSeparatorIndex + 1 ), //__dirname + '/resources/',
            outputFileName = "XX" + fileName,
            outputFilePath = dirPath + outputFileName + ".ts",
            sourceFile = this.getAST(path, content),
            ui5DefineStatement = this.getUI5Define(sourceFile);

        var declarationsBlock;
        if( !ui5DefineStatement ) {
            declarationsBlock = ts.factory.createBlock(sourceFile.statements);
        } else {
            let info = this.getUI5Definitions(ui5DefineStatement),
                imports = info.imports,
            importDeclarations = imports.map(([name, path]) => ts.factory.createImportDeclaration(
                    undefined, //[] as ts.Decorator[],
                    undefined, // [] as ts.Modifier[],
                    ts.factory.createImportClause(false , ts.factory.createIdentifier(name), undefined),
                    ts.factory.createStringLiteral(path))
                ),
            classDeclarations = info.classes.map(classInfo => this.getClassDeclaration(classInfo));
            declarationsBlock = ts.factory.createBlock(([] as Statement[]).concat(importDeclarations).concat(classDeclarations).concat(info.otherExpressions || []) as Statement[]);
        }
        let printer = createPrinter({ newLine: NewLineKind.LineFeed }),
            resultFile = createSourceFile(
                outputFilePath,
                "",
                ScriptTarget.Latest,
                /*setParentNodes*/ false,
                ScriptKind.TS
            );

        let newContent = declarationsBlock.statements.flatMap(s => s).map(s =>
            printer.printNode(EmitHint.Unspecified, s, resultFile)).join("\n");
        
        return newContent;
    }
 
}
