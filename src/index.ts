#!/usr/bin/env node
import { ASTService } from "./ASTService";
// import { ITaskParameters, Workspace } from "./model/types";
import { promises as fs } from 'fs';
import { glob } from "glob";
import util = require('util');
import { UI5Resource } from "./UI5Resource";
const exec = util.promisify(require('child_process').exec);

async function addProjectDependencies(projectPath: string, topLevelFiles: string[]) {
    // TODO check if already added & supported versions
    let tsDependencies = "typescript @types/openui5@1.91.0 @types/jquery@3.5.1 @types/qunit@2.5.4";
    const { stdout, stderr } = await exec(
        topLevelFiles.includes("yarn.lock") ?
        `yarn add ${tsDependencies} -D` :
        `npm install add ${tsDependencies} --save-dev `, {cwd: projectPath});
}

function addConfigFiles() {
    // eslintrc.parserOptions.sourceType = "module"
    throw new Error("Function not implemented. add or edit tsconfig, eslintrc");
}

/**
 * Migrates ADM Style UI5 Classes to typescript classes.
 */
export async function migrate(args: string[]) {
    
    let // TODO use argv later for params
    projectPath = args[2] || __dirname,
    topLevelFiles = await fs.readdir(projectPath);

    addProjectDependencies(projectPath, topLevelFiles)
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

migrate(process.argv);
