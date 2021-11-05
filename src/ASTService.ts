
import {addSyntheticTrailingComment, createPrinter, createProgram, NewLineKind, SyntaxKind, SourceFile, EmitHint, CallExpression, FunctionExpression, ObjectLiteralExpression, VariableDeclaration, StringLiteral, PropertyAccessExpression, Identifier, PropertyAssignment, ExpressionStatement, Expression, BinaryExpression, HeritageClause, ClassElement, Statement, TypeParameterDeclaration, ScriptTarget, ScriptKind, createSourceFile, ModuleKind, factory, ModifierFlags, Node, ImportDeclaration, ClassDeclaration, ConstructorDeclaration} from 'typescript';
import jsonata from "jsonata";
import { UI5Resource } from './UI5Resource';

export class ASTService {
    static printer = createPrinter({ newLine: NewLineKind.LineFeed });

    static getAST(jsFilePath: string, content?: string) : SourceFile {
        return content != null ? createSourceFile(
            jsFilePath,                  // filePath
            content, // fileText 
            ScriptTarget.ES2020,     // scriptTarget
            true                        // setParentNodes -- sets the `parent` property
        ) : createProgram([jsFilePath], {
            allowJs: true,
            module: ModuleKind.ES2020
        }).getSourceFile(jsFilePath) as SourceFile;
    }

    static print(node: Node, sourceFile?: SourceFile) {
        return this.printer.printNode(EmitHint.Unspecified, node, sourceFile ?? node.getSourceFile() ?? createSourceFile(
            "", //outputFilePath,
            "",
            ScriptTarget.Latest,
            /*setParentNodes*/ false,
            ScriptKind.TS
        ));
    }

}

