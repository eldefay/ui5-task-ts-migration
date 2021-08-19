import * as chai from "chai";
import * as sinon from "sinon";

import { ASTService } from "../src/ASTService";
import { IProjectOptions } from "../src/model/types";
import ResourceUtil from "../src/util/resourceUtil";
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

    it("should download and write base files", async () => {
    //    await runUi5TaskAdaptation(OPTIONS);
    //     expect(html5RepoManagerStub.getCalls().length).to.equal(1);
    });

    it("should migrate single ui5 class ", async () => {
        
        let path = __dirname + '/resources/CardEditor.js',
            result = ASTService.migrateUI5SourceFileFromES5(path);

        expect(result == "CardEditor");
    });

    it("should run task ", async () => {
        runMigrationTask(OPTIONS);
        // const tempResources = await ResourceUtil.readTemp(OPTIONS.configuration);
        // expect([...tempResources.keys()]).to.have.members(["/manifest.json"]);
    });

});

const runMigrationTask = async (options: IProjectOptions) => {
    const { workspace, taskUtil } = await TestUtil.getWorkspace("app");
    const workspaceSpied = sinon.spy(workspace, "write");
    await index({ workspace, options: options, taskUtil });
    const resourcePaths = workspaceSpied.getCalls().map(call => call.args[0].getPath());
    expect(resourcePaths).to.have.members([
        "/resources/manifest.json"
    ]);
}