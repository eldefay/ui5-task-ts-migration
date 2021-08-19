import { IConfiguration, ITaskParameters, Workspace } from "./model/types";

import ResourceUtil from "./util/resourceUtil";

/**
 * Creates an appVariant bundle from the provided resources.
 */
module.exports = ({ workspace, options, taskUtil }: ITaskParameters) => {

    async function process(workspace: Workspace, taskUtil: any) {
        workspace;
        options;
        taskUtil;
        let jsFiles = await workspace.byGlob("/**/*.js");
        // await Promise.all(appVariantResources.concat(baseAppResources).map(resource => workspace.write(resource)));
    }

    return process(workspace, taskUtil);

}