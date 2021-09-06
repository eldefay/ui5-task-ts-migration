import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import util from 'util';
import { UI5Resource } from '../UI5Resource';

export async function addTypescriptProjectDependencies(projectPath: string) {
    let topLevelFiles = await fs.readdir(projectPath),
    // TODO check if already added & supported versions
    tsDependencies = "typescript @types/openui5@1.91.0 @types/jquery@3.5.1 @types/qunit@2.5.4";
    const { stdout, stderr } = await util.promisify(exec)(
        topLevelFiles.includes("yarn.lock") ?
        `yarn add ${tsDependencies} -D` :
        `npm install ${tsDependencies} --save-dev `, {cwd: projectPath});
}

function addConfigFiles() {
    // TODO
    // edit(eslintrc).parserOptions.sourceType = "module"
    // add or edit tsconfig config & add local references to generated typescript for libraries
    throw new Error("Function not implemented");
}

/**
 * Migrates ADM Style UI5 Classes to typescript classes.
 */
 export async function migrate(args: string[]) {
    
    let // TODO use argv later for params
    projectPath = args[2] || __dirname;

    addTypescriptProjectDependencies(projectPath);
    // addConfigFiles();
    return new Promise(async (success, fail) => {
        glob("!(node_modules|dist)/**/*.js", {
            cwd: projectPath,
            absolute: true
        }, (error: Error| null, matches: string[]) => {
            if (error) {
                fail(error);
            }
            let filesWritten = Promise.all(matches.map(filePath => {
                let outputFilePath = filePath.replace(/.js$/g, ".ts"),
                ui5Resource = new UI5Resource(filePath, projectPath);
                return ui5Resource.migrateUI5SourceFileFromES5()
                    .then( newContent => fs.writeFile(outputFilePath, newContent))
                    .catch(error => {
                        console.error(error?.message);
                        throw error;
                    });
            }));
            success(matches);
        });
    })
}