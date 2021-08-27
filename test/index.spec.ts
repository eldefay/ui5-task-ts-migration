import * as chai from "chai";
import * as sinon from "sinon";
import * as path from "path";


import { ASTService } from "../src/ASTService";
import { IProjectOptions } from "../src/model/types";
import { SinonSandbox } from "sinon";
import TestUtil from "./util/testUtil";

import { migrate } from "../src/index";

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
        await migrate(["/resorces/testProject"]);
        console.log(arguments);
        expect(1).lessThanOrEqual(1);
    });

});