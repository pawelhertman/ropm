"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanCommand = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
const util_1 = require("../util");
const InitCommand_1 = require("./InitCommand");
const del = require("del");
class CleanCommand {
    constructor(args) {
        this.args = args;
    }
    get hostRootDir() {
        var _a, _b;
        if (this.args.rootDir) {
            return path.resolve(this.cwd, this.args.rootDir);
        }
        else {
            const packageJsonRootDir = (_b = (_a = this.hostPackageJson) === null || _a === void 0 ? void 0 : _a.ropm) === null || _b === void 0 ? void 0 : _b.rootDir;
            if (packageJsonRootDir) {
                return path.resolve(this.cwd, packageJsonRootDir);
            }
            else {
                return this.cwd;
            }
        }
    }
    /**
     * Determine if we should load the host package.json from disk or not
     */
    get skipLoadHostPackageJson() {
        return !!this.args.rootDir;
    }
    /**
     * A "host" is the project we are currently operating upon. This method
     * finds the package.json file for the current host
     */
    async loadHostPackageJson() {
        if (this.skipLoadHostPackageJson === false) {
            //if the host doesn't currently have a package.json
            if (await fsExtra.pathExists(path.resolve(this.cwd, 'package.json')) === false) {
                console.log('Creating package.json');
                //init package.json for the host
                await new InitCommand_1.InitCommand({ cwd: this.cwd, force: true }).run();
            }
            this.hostPackageJson = await util_1.util.getPackageJson(this.cwd);
        }
    }
    async run() {
        await this.loadHostPackageJson();
        await this.deleteAllRokuModulesFolders();
    }
    async deleteAllRokuModulesFolders() {
        const rokuModulesFolders = await util_1.util.globAll([
            '*/roku_modules',
            '!node_modules/**/*'
        ], {
            cwd: this.hostRootDir,
            absolute: true
        });
        //delete the roku_modules folders
        await Promise.all(rokuModulesFolders.map(async (rokuModulesDir) => {
            console.log(`ropm: deleting ${rokuModulesDir}`);
            await del(rokuModulesDir, {
                force: true
            });
            //if the parent dir is now empty, delete that folder too
            const parentDir = path.dirname(rokuModulesDir);
            if (await util_1.util.isEmptyDir(parentDir)) {
                console.log(`ropm: deleting empty ${parentDir}`);
                await del(parentDir, {
                    force: true
                });
            }
        }));
    }
    get cwd() {
        var _a, _b;
        if ((_a = this.args) === null || _a === void 0 ? void 0 : _a.cwd) {
            return path.resolve(process.cwd(), (_b = this.args) === null || _b === void 0 ? void 0 : _b.cwd);
        }
        else {
            return process.cwd();
        }
    }
}
exports.CleanCommand = CleanCommand;
//# sourceMappingURL=CleanCommand.js.map