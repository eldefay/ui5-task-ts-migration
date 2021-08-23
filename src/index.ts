import { ASTService } from "./ASTService";
import { ITaskParameters, Workspace } from "./model/types";

const resourceFactory = require("@ui5/fs/lib/resourceFactory");
const Resource = require("@ui5/fs/lib/Resource");

/**
 * Migrates ADM Style UI5 Classes to typescript classes.
 */
module.exports = ({ workspace, options, taskUtil }: ITaskParameters) => {

    async function migrate(workspace: Workspace, taskUtil: any) {
        workspace;
        options;
        taskUtil;
        let jsFiles = await workspace.byGlob("/**/*.js");
        let w = await Promise.all(jsFiles.map(async resource => {
            resource.getBuffer().toString();
            let typescriptContent = ASTService.migrateUI5SourceFileFromES5(resource.getPath(), (await resource.getBuffer()).toString());
            return workspace.write(new Resource({
                path: resource.getPath().replace(/.js$/g, ".ts"),
                string: typescriptContent
            }));
        }));

        return w;
    }

    return migrate(workspace, taskUtil);

}