import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

import { IConfiguration } from "../model/types";

const tempFolder = require('temp-dir');
const resourceFactory = require("@ui5/fs/lib/resourceFactory");

export default class ResourceUtil {

    public static METADATA_FILENAME = "html5metadata.json";

    static getRootFolder(projectNamespace?: string) {
        const newPath = ["/resources"];
        if (projectNamespace) {
            newPath.push(projectNamespace);
        }
        return path.join(...newPath);
    }

    static async getFiles(path: string): Promise<Map<string, string>> {
        const baseAppTempFolder = path;
        const files = new Map<string, string>();
        if (fs.existsSync(baseAppTempFolder)) {
            this.fetchFiles(baseAppTempFolder, baseAppTempFolder, files);
        }
        return files;
    }


    static fetchFiles(rootFolder: string, folder: string, baseAppFiles: Map<string, string>) {
        const entries = fs.readdirSync(folder);
        for (let entry of entries) {
            const entryPath = path.join(folder, entry);
            const stats = fs.lstatSync(entryPath);
            if (stats.isFile() && !entryPath.endsWith(this.METADATA_FILENAME)) {
                const normalized = entryPath.substring(rootFolder.length);
                baseAppFiles.set(normalized, fs.readFileSync(entryPath, { encoding: "utf-8" }));
            } else if (stats.isDirectory()) {
                this.fetchFiles(rootFolder, entryPath, baseAppFiles);
            }
        }
    }

}