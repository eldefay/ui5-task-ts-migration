import { ASTService } from "./ASTService";
// import { ITaskParameters, Workspace } from "./model/types";
import { promises as fs } from 'fs';
import { glob } from "glob";
import util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * Migrates ADM Style UI5 Classes to typescript classes.
 */
export async function migrate(args: string[]) {
    
    return new Promise(async (success, fail) => {
        let tsDependencies = "typescript @types/openui5@1.91.0 @types/jquery@3.5.1 @types/qunit@2.5.4",
            // TODO use argv later for params
            projectPath = args[0],
            topLevelFiles = await fs.readdir(projectPath);

        const { stdout, stderr } = await exec(
            topLevelFiles.includes("yarn.lock") ?
            `yarn add ${tsDependencies} -D` :
            `npm install add ${tsDependencies} --save-dev `);
        // addConfigFiles();
        
        glob("!(node_modules|dist)/**/*.js", {
            cwd: projectPath,
            absolute: true
        }, (error: Error| null, matches: string[]) => {
            if (error) {
                fail(error);
            }
            let filesWritten = Promise.all(matches.map(filePath => {
                let outputFilePath = filePath.replace(/.js$/g, ".ts"),
                content = ASTService.migrateUI5SourceFileFromES5(filePath);
                fs.writeFile(outputFilePath, content);
            })).catch(error =>{
                fail(error);
                debugger;
            });
            success(matches);
        });
    })
}

migrate(process.argv)

function addConfigFiles() {
    throw new Error("Function not implemented.");
}
