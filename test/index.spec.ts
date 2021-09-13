import * as sinon from "sinon";
import { promises as fs } from 'fs';

import { SinonSandbox } from "sinon";

import { addTypescriptProjectDependencies, migrate, UI5MigrationProject } from '../src/UI5MigrationProject';
import { UI5Resource } from "../src/UI5Resource";

describe("Migration Tests", () => {
    let localTestProjectPath = __dirname + '/resources/testProject';
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should migrate ui5 class variations", async function() {
        jest.setTimeout(100000);
        let testProject = new UI5MigrationProject(localTestProjectPath);
        
        await addTypescriptProjectDependencies(localTestProjectPath);
        await testProject.createProgram();

        ["ClassOne", "ClassTwo"].map(async cName => {
            let path = localTestProjectPath + "/src/" + cName + ".js",
            ui5Resource = new UI5Resource(path, testProject),
            result = "";
            
            try {
                ui5Resource.analyse()
                result = ui5Resource.getTypescriptContent() || "";
            } catch(error) {
                console.error(error)
            }

            let referenceOutput = await fs.readFile(path.replace(/.js$/g, ".reference.ts"), { encoding: "utf-8" });
            
            expect(result).toEqual(referenceOutput);
        });
    });

    xit("should run task ", async function() {
        await migrate(["", "", localTestProjectPath]);
        // TODO mock fs in memory
        // expect(fs.writeFile).toHaveBeenCalledTimes(3);
    });

});