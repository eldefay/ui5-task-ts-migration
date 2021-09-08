import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import util from 'util';
import { UI5Resource } from './UI5Resource';
import { createProgram, ModuleKind, Program } from 'typescript';
import findWorkspaceRoot from 'find-workspace-root';
import path from 'path';

export class UI5MigrationProject {
    program: Program | undefined;
    workspacePath: string | null = null;
    ui5Resources: UI5Resource[] = [];
    constructor(public path: string) {
        
    }

    async createProgram() {
        let pattern = "!(node_modules|dist|coverage)/**/*.js";
        let jsFilePaths = await util.promisify(glob)(pattern, {
            cwd: this.path,
            absolute: true
        });
        this.program = createProgram(jsFilePaths, {
            allowJs: true,
            module: ModuleKind.ES2020
        });
    }

    async analyse() {
        this.workspacePath = await findWorkspaceRoot(this.path);
        await this.createProgram();

        return Promise.all((this.program?.getRootFileNames() || []).map(async (filePath, index) => {
            // let outputFilePath = filePath.replace(/.js$/g, ".ts");
            this.ui5Resources[index] = new UI5Resource(filePath, this);
            this.ui5Resources[index].analyse();
            // let newContent = await ui5Resource.migrateUI5SourceFileFromES5();
            // fs.writeFile(outputFilePath, newContent);
        }));
    }

    async addConfigFiles() {
        // TODO add or edit tsconfig config & add local references to generated typescript for libraries
        
        let rootPath = this.workspacePath || this.path,
            eslintrcPath = path.join(rootPath, ".eslintrc"),
            eslintrc = await fs.readFile(eslintrcPath, { encoding: "utf-8" });
        
        if( eslintrc ) {
            let eslintrcJSON = JSON.parse(eslintrc)
            if( eslintrcJSON?.parserOptions?.sourceType ){
                eslintrcJSON.parserOptions.sourceType = "module";
                fs.writeFile(eslintrcPath, JSON.stringify(eslintrcJSON));
            }
        }
    }

    async migrate() {
        await addTypescriptProjectDependencies(this.path);
        await this.addConfigFiles();
        await this.analyse();
        
        this.ui5Resources.forEach(async ui5Resource => {
            let outputFilePath = ui5Resource.path.replace(/.js$/g, ".ts");
            let newContent = ui5Resource.getTypescriptContent();
            fs.writeFile(outputFilePath, newContent);
            console.log("transformed", this.path);
            // console.log("newContent", newContent);
        });
    }
}

export async function addTypescriptProjectDependencies(projectPath: string) {
    let topLevelFiles = await fs.readdir(projectPath),
    // TODO check if already added & supported versions
    tsDependencies = "typescript @types/openui5@1.91.0 @types/jquery@3.5.1 @types/qunit@2.5.4";
    const { stdout, stderr } = await util.promisify(exec)(
        topLevelFiles.includes("yarn.lock") ?
        `yarn add ${tsDependencies} -D` :
        `npm install ${tsDependencies} --save-dev `, {cwd: projectPath});
}



/**
 * Migrates ADM Style UI5 Classes to typescript classes.
 */
export async function migrate(args: string[]) {
    
    let // TODO use argv later for params
    projectPath = args[2] || __dirname;

    let project = new UI5MigrationProject(projectPath);
    return project.migrate();
}