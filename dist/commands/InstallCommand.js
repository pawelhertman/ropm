"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallCommand = void 0;
const util_1 = require("../util");
const path = require("path");
const childProcess = require("child_process");
const fsExtra = require("fs-extra");
const InitCommand_1 = require("./InitCommand");
const CleanCommand_1 = require("./CleanCommand");
const ModuleManager_1 = require("../prefixer/ModuleManager");
class InstallCommand {
    constructor(args) {
        this.args = args;
        this.moduleManager = new ModuleManager_1.ModuleManager();
    }
    get hostRootDir() {
        var _a, _b, _c;
        const packageJsonRootDir = (_a = this.args.rootDir) !== null && _a !== void 0 ? _a : (_c = (_b = this.hostPackageJson) === null || _b === void 0 ? void 0 : _b.ropm) === null || _c === void 0 ? void 0 : _c.rootDir;
        if (packageJsonRootDir) {
            return path.resolve(this.cwd, packageJsonRootDir);
        }
        else {
            return this.cwd;
        }
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
    async run(runNpmInstall = true) {
        await this.loadHostPackageJson();
        await this.deleteAllRokuModulesFolders();
        if (runNpmInstall) {
            await this.npmInstall();
        }
        await this.processModules();
    }
    /**
     * Deletes every roku_modules folder found in the hostRootDir
     */
    async deleteAllRokuModulesFolders() {
        const cleanCommand = new CleanCommand_1.CleanCommand({
            cwd: this.cwd
        });
        await cleanCommand.run();
    }
    /**
     * A "host" is the project we are currently operating upon. This method
     * finds the package.json file for the current host
     */
    async loadHostPackageJson() {
        //if the host doesn't currently have a package.json
        if (await fsExtra.pathExists(path.resolve(this.cwd, 'package.json')) === false) {
            console.log('Creating package.json');
            //init package.json for the host
            await new InitCommand_1.InitCommand({ cwd: this.cwd, force: true, promptForRootDir: true }).run();
        }
        this.hostPackageJson = await util_1.util.getPackageJson(this.cwd);
    }
    async npmInstall() {
        var _a;
        if (await fsExtra.pathExists(this.cwd) === false) {
            throw new Error(`"${this.cwd}" does not exist`);
        }
        await util_1.util.spawnNpmAsync([
            'i',
            ...((_a = this.args.packages) !== null && _a !== void 0 ? _a : [])
        ], {
            cwd: this.cwd
        });
    }
    /**
     * Copy all modules to roku_modules
     */
    async processModules() {
        var _a, _b, _c;
        const modulePaths = this.getProdDependencies();
        //remove the host module from the list (it should always be the first entry)
        const hostModulePath = modulePaths.splice(0, 1)[0];
        this.moduleManager.hostDependencies = await util_1.util.getModuleDependencies(hostModulePath);
        this.moduleManager.hostRootDir = this.hostRootDir;
        this.moduleManager.noprefixNpmAliases = (_c = (_b = (_a = this.hostPackageJson) === null || _a === void 0 ? void 0 : _a.ropm) === null || _b === void 0 ? void 0 : _b.noprefix) !== null && _c !== void 0 ? _c : [];
        //copy all of them at once, wait for them all to complete
        for (const modulePath of modulePaths) {
            this.moduleManager.addModule(modulePath);
        }
        await this.moduleManager.process();
    }
    /**
     * Get the list of prod dependencies from npm.
     * This is run sync because it should run as fast as possible
     * and won't be run in ~parallel.
     */
    getProdDependencies() {
        if (fsExtra.pathExistsSync(this.cwd) === false) {
            throw new Error(`"${this.cwd}" does not exist`);
        }
        let stdout;
        try {
            stdout = childProcess.execSync('npm ls --parseable --depth=Infinity', {
                cwd: this.cwd
            }).toString();
        }
        catch (e) {
            stdout = e.stdout.toString();
            const stderr = e.stderr.toString();
            //sometimes the unit tests absorb stderr...so as long as we have stdout, assume it's valid (and ignore the stderr)
            if (stderr.includes('npm ERR! extraneous:')) {
                //ignore errors
            }
            else {
                throw new Error('Failed to compute prod dependencies: ' + e.message);
            }
        }
        return stdout.trim().split(/\r?\n/);
    }
}
exports.InstallCommand = InstallCommand;
//# sourceMappingURL=InstallCommand.js.map