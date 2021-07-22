"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UninstallCommand = void 0;
const util_1 = require("../util");
const path = require("path");
const InstallCommand_1 = require("./InstallCommand");
class UninstallCommand {
    constructor(args) {
        this.args = args;
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
    async run() {
        await this.npmUninstall();
        //after uninstalling the specified packages, we need to run an install again. it's easier than tracking down what files to remove directly
        await this.npmInstall();
    }
    async npmUninstall() {
        var _a;
        await util_1.util.spawnNpmAsync([
            'uninstall',
            ...((_a = this.args.packages) !== null && _a !== void 0 ? _a : [])
        ], {
            cwd: this.cwd
        });
    }
    /**
     * Should be run after an uninstall
     */
    async npmInstall() {
        const installCommand = new InstallCommand_1.InstallCommand({
            cwd: this.cwd,
            packages: []
        });
        await installCommand.run();
    }
}
exports.UninstallCommand = UninstallCommand;
//# sourceMappingURL=UninstallCommand.js.map