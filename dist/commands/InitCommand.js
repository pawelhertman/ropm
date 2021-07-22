"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const path = require("path");
const util_1 = require("../util");
const fsExtra = require("fs-extra");
class InitCommand {
    constructor(args) {
        this.args = args;
    }
    async run() {
        if (await fsExtra.pathExists(this.cwd) === false) {
            throw new Error(`"${this.cwd}" does not exist`);
        }
        await this.getRootDirFromUser();
        await util_1.util.spawnNpmAsync([
            'init',
            this.force ? '--force' : undefined
        ], {
            cwd: this.cwd,
            stdio: 'inherit'
        });
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
    get force() {
        return this.args.force === true;
    }
    get promptForRootDir() {
        //explicitly check for "true", because undefined is valid and means "default to value of force"
        return this.args.promptForRootDir === true || this.force === false;
    }
    /**
     * If the package.json is missing `ropm.rootDir`, prompt user for that info
     */
    async getRootDirFromUser() {
        const packagePath = path.join(this.cwd, 'package.json');
        let packageJson = {};
        if (fsExtra.pathExistsSync(packagePath)) {
            packageJson = await util_1.util.getPackageJson(this.cwd);
        }
        if (!packageJson.ropm) {
            packageJson.ropm = {};
        }
        //if there is no rootDir present
        if (!packageJson.ropm.rootDir) {
            if (this.promptForRootDir) {
                const answer = await util_1.util.getUserInput(`What is the rootDir for your project (./):`);
                packageJson.ropm.rootDir = answer.trim() || './';
            }
            else {
                //default to current directory
                packageJson.ropm.rootDir = './';
            }
        }
        fsExtra.writeJsonSync(packagePath, packageJson, {
            spaces: 4
        });
    }
}
exports.InitCommand = InitCommand;
//# sourceMappingURL=InitCommand.js.map