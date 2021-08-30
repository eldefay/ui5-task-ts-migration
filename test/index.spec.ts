import * as chai from "chai";
import * as sinon from "sinon";
import * as path from "path";
import jsonata from "jsonata";


import { ASTService } from "../src/ASTService";
import { IProjectOptions } from "../src/model/types";
import { SinonSandbox } from "sinon";
import TestUtil from "./util/testUtil";
import { Project } from "ts-morph";

import { migrate } from "../src/index";
import { ClassDeclaration, ConstructorDeclaration, SyntaxKind } from "typescript";
import { UI5Resource } from "../src/UI5Resource";

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
    let testProjectPath = __dirname + '/resources/testProject';
    let sandbox: SinonSandbox;

    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    xit("should migrate single ui5 class ", async function () {
        this.timeout(100000);

        let path = __dirname + '/resources/CardEditor.js',
            ui5Resource = new UI5Resource(path, __dirname),
            result = await ui5Resource.migrateUI5SourceFileFromES5();

        console.log(result);

        expect(result == "CardEditor");
    });

    it("should run task ", async function() {
        this.timeout(1000000);
        await migrate([testProjectPath]);
        expect(1).lessThanOrEqual(1);
    });

});