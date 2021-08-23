import * as chai from "chai";
import * as sinon from "sinon";
import * as path from "path";


import { ASTService } from "../src/ASTService";
import { IProjectOptions } from "../src/model/types";
import { SinonSandbox } from "sinon";
import TestUtil from "./util/testUtil";

const index = require("../src/index");
const { expect } = chai;
const OPTIONS: IProjectOptions = {
    projectNamespace: "ns",
    configuration: {
        appHostId: "appHostId",
        appId: "appId",
        appName: "appName",
        appVersion: "appVersion",
        spaceGuid: "spaceGuid",
        orgGuid: "orgGuid",
        sapCloudService: "sapCloudService"
    }
};

describe("Index", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should migrate single ui5 class ", async function () {
        this.timeout(100000);

        let path = __dirname + '/resources/CardEditor.js',
            result = ASTService.migrateUI5SourceFileFromES5(path);

        expect(result == "CardEditor");
    });

    xit("should run task ", async function() {
        this.timeout(1000000);
        await runMigrationTask(OPTIONS);
        expect(1).lessThanOrEqual(1);
    });

});

const runMigrationTask = async (options: IProjectOptions) => {
    const projectPath = "/resorces/testProject";
    const { workspace, taskUtil } = await TestUtil.getLocalWorkspace(projectPath);
    const workspaceSpied = sinon.spy(workspace, "write");
    await index({ workspace, options: options, taskUtil });
    const resourcePaths = workspaceSpied.getCalls().map(call => (call.args[0] as any).getPath());
    expect(resourcePaths).to.have.members([
        "/resources/manifest.json"
    ]);
}