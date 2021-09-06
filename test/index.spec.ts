import * as sinon from "sinon";
import { promises as fs } from 'fs';

import { SinonSandbox } from "sinon";

import { addTypescriptProjectDependencies, migrate } from '../src/util/projectUtil';
import { UI5Resource } from "../src/UI5Resource";

describe("Migration Tests", () => {
    let localTestProjectPath = __dirname + '/resources/testProject';
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should migrate ui5 class variations", async function() {

        await addTypescriptProjectDependencies(localTestProjectPath);

        ["ClassOne", "ClassTwo"].map(async cName => {
            let path = localTestProjectPath + "/src/" + cName + ".js",
            ui5Resource = new UI5Resource(path, localTestProjectPath),
            result = "";
            
            try {
                result = await ui5Resource.migrateUI5SourceFileFromES5();
            } catch(error) {
                console.error(error)
            }

            let referenceOutput = await fs.readFile(path.replace(/.js$/g, ".reference.ts"), { encoding: "utf-8" });
            
            expect(result).toEqual(referenceOutput);
        });
    });

    xit("should run task ", async function() {
        await migrate(["", "", localTestProjectPath]);
        expect(1).toBe(1);
    });

});