
import {createPrinter, createProgram, NewLineKind, SyntaxKind, SourceFile, EmitHint, CallExpression, FunctionExpression, ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression, Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression, HeritageClause, ClassElement, Statement, TypeParameterDeclaration, ScriptTarget, ScriptKind, createSourceFile, ModuleKind} from 'typescript';
import * as jsonata from "jsonata";

import { Project, ts } from "ts-morph";

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
	
    static getAST(jsFilePath: string) : SourceFile {
        let program = ts.createProgram([jsFilePath], {
            allowJs: true,
            module: ModuleKind.ES2020
        });
        return program.getSourceFile(jsFilePath) as SourceFile;
    }

    static getUI5Define(sourceFileAst: SourceFile) : CallExpression {
        // searchin only for one sap.ui.define
        return jsonata(`statements[
            expression.expression.expression.expression.escapedText='sap' and
            expression.expression.expression.name.escapedText='ui' and
            expression.expression.name.escapedText='define'].expression`).evaluate(sourceFileAst) as CallExpression
    }
 
    static getUI5Definitions(ui5DefineAst: CallExpression) {
        let extendAsts = jsonata("arguments[1].body.statements[declarationList.declarations[0].initializer.expression.name.text='extend']").evaluate(ui5DefineAst),
            extendDeclarations = extendAsts.length > 1 ? extendAsts : [extendAsts],
            classInfos = extendDeclarations.map(this.getUI5ClassInfo) as ClassInfo[],
            otherDeclerations = (ui5DefineAst.arguments[1] as FunctionExpression).body.statements.filter(n => n != extendDeclarations[0]);
            
            classInfos.forEach(classInfo => {
                let classMethods = jsonata("$[expression.left.expression.name.text='prototype' and expression.left.expression.expression.text='" + classInfo.className + "'].expression").evaluate(otherDeclerations)
                .map((d:any) => [d.left.name.text, d.right]) as [string, FunctionExpression][];
                
                // TODO cleanup super calls, replace .. prototype...apply(this, arguments) => super arguments
                classInfo.methods = classMethods;
            });

        return {
            imports: jsonata("$zip(arguments[1].[parameters.name.text], arguments[0].[elements.text])").evaluate(ui5DefineAst) as [[string,string]],
            classes: classInfos
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
            ui5ClassSettings = (extendCall.arguments[1] as ObjectLiteralExpression).properties.map(p =>
                [(p.name as Identifier).text, (p as PropertyAssignment).initializer]) as [[ string , Expression ]];
            
        return {
            jsDocs: jsDocs,
            className : className,
            nameSpace : nameSpace,
            superClassName : superClassName,
            ui5ClassSettings : ui5ClassSettings
        }
    }

    static getClassDecleration(classInfo: ClassInfo) {
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
                    ts.factory.createModifiersFromModifierFlags(name.substr(0,1) == "_" ? ts.ModifierFlags.Public : ts.ModifierFlags.Private),
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
    
    static migrateUI5SourceFileFromES5(path: string) : any {

        let lastPathSepearatorIndex = path.lastIndexOf("/"),
            fileName    = path.substring(lastPathSepearatorIndex + 1, path.lastIndexOf(".")),
            dirPath     = path.substring(0, lastPathSepearatorIndex + 1 ), //__dirname + '/resources/',
            outputFileName = "XX" + fileName,
            outputFilePath = dirPath + outputFileName + ".ts",
            sourceFile = this.getAST(path),
            ui5DefineStatement = this.getUI5Define(sourceFile),
            info = this.getUI5Definitions(ui5DefineStatement),
            imports = info.imports,
            className = info.classes[0].className,
            nameSpace = info.classes[0].nameSpace,
            superClassName = info.classes[0].superClassName,
            ui5ClassSettingsAst = info.classes[0].ui5ClassSettings;
            // tsPrinter = createPrinter({ newLine: NewLineKind.LineFeed }),
            // x = tsPrinter.printNode(EmitHint.Unspecified, extendCall.arguments[1], sourceFile);
        
        // using typescript printer
        let importDeclerations = imports.map(([name, path]) => ts.factory.createImportDeclaration(
                    undefined, //[] as ts.Decorator[],
                    undefined, // [] as ts.Modifier[],
                    ts.factory.createImportClause(false , ts.factory.createIdentifier(name), undefined),
                    ts.factory.createStringLiteral(path))
                ),
            classDeclerations = info.classes.map(classInfo => this.getClassDecleration(classInfo)),
            declerationsBlock = ts.factory.createBlock(([] as Statement[]).concat(importDeclerations).concat(classDeclerations) as Statement[]),// [].concat([classDecleration]).concat(importDeclerations) as ts.NodeArray<ts.Node>,
            printer = createPrinter({ newLine: NewLineKind.LineFeed }),
            resultFile = createSourceFile(
                outputFilePath,
                "",
                ScriptTarget.Latest,
                /*setParentNodes*/ false,
                ScriptKind.TS
            );

        let content = declerationsBlock.statements.flatMap(s => s).map(s =>
            printer.printNode(EmitHint.Unspecified, s, resultFile)).join("\n");
        console.log(content);
        
    

        // ts-morph for creating new files
        let project = new Project({
                compilerOptions : {
                    allowJs: true,
                }
            }),
            tsSourceFile = project.createSourceFile(dirPath + outputFileName + ".ts", {
                statements: resultFile.getFullText(),
                // etc...
            }, { overwrite: true });
        
        // tsSourceFile.save();
        // jsSourceFile.save();
        
        return content;
    }
 
}
