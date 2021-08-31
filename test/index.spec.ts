import * as chai from "chai";
import * as sinon from "sinon";
import * as fs from "fs";

import { SinonSandbox } from "sinon";

import { migrate } from "../src/index";
import { UI5Resource } from "../src/UI5Resource";

const { expect } = chai;

describe("Index", () => {
    let testProjectPath = __dirname + '/resources/testProject';
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should migrate ui5 class variations", async function () {
        this.timeout(100000);

        ["ClassOne", "ClassTwo"].map(async cName => {
            let path = __dirname + "/resources/" + cName + ".js",
            ui5Resource = new UI5Resource(path, __dirname),
            result = await ui5Resource.migrateUI5SourceFileFromES5();

            let referenceOutput = fs.readFileSync(path.replace(/.js$/g, ".ts"), { encoding: "utf-8" });

            expect(result).equal(referenceOutput, cName + " migration" );
        });
    });

    xit("should run task ", async function() {
        this.timeout(1000000);
        await migrate(["", "", testProjectPath]);
        expect(1).lessThanOrEqual(1);
    });

});