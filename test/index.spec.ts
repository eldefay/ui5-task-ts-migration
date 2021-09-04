import * as chai from "chai";
import * as sinon from "sinon";
import { promises as fs } from 'fs';

import { SinonSandbox } from "sinon";

import { addTypescriptProjectDependencies, migrate } from '../src/util/projectUtil';
import { UI5Resource } from "../src/UI5Resource";

const { assert, expect } = chai;
describe("Index", () => {
    let localTestProjectPath = __dirname + '/resources/testProject';
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should migrate ui5 class variations", async function() {
        this.timeout(100000);

        await addTypescriptProjectDependencies(localTestProjectPath);

        ["ClassOne", "ClassTwo", "singleton"].map(async cName => {
            let path = localTestProjectPath + "/src/" + cName + ".js",
            ui5Resource = new UI5Resource(path, localTestProjectPath),
            result = "";
            
            try {
                result = await ui5Resource.migrateUI5SourceFileFromES5();
            } catch(error) {
                console.error(error)
            }

            let referenceOutput = await fs.readFile(path.replace(/.js$/g, ".reference.ts"), { encoding: "utf-8" });
            
            expect(result).to.equal(referenceOutput, cName + " migration" );
        });
    });

    xit("should run task ", async function() {
        this.timeout(1000000);
        await migrate(["", "", localTestProjectPath]);
        expect(1).lessThanOrEqual(1);
    });

});