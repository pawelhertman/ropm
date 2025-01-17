"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleManager = void 0;
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
const RopmModule_1 = require("./RopmModule");
const semver = require("semver");
const util_1 = require("../util");
class ModuleManager {
    constructor() {
        this.modules = [];
        /**
         * A list of all direct dependencies of the host application.
         * This is used to pick which version prettier prefixes whenever there's multiple versions required
         */
        this.hostDependencies = [];
        /**
         * A list of npm aliases of modules that should not have their source code prefixed during ropm install.
         * This is the npm alias name.
         */
        this.noprefixNpmAliases = [];
        /**
         * A list of ropm aliases of modules that should not have their source code prefixed during ropm install.
         * This is the ropm alias name, and is only resolved later in the process so don't use this unless you know for sure it is populated
         */
        this.noprefixRopmAliases = [];
    }
    /**
     * Add a new project to the prefixer
     * @param filePaths the list of absolute file paths for this project
     * @param prefix the prefix to give all of this module's own functions and components (and their internal usage)
     * @param prefixMap if this module has its own dependencies, then this prefix map allows us to rename those prefixes
     */
    addModule(modulePath) {
        this.modules.push(new RopmModule_1.RopmModule(this.hostRootDir, modulePath));
    }
    /**
     * Initialize all modules
     */
    async process() {
        //init all modules
        await Promise.all(this.modules.map(x => x.init()));
        //remove duplicate/unnecessary modules
        await this.reduceModulesAndCreatePrefixMaps();
        //copy every file from every module to its target location
        await Promise.all(this.modules.map(x => x.copyFiles()));
        //have each module apply transforms (rename functions, components, file paths, etc...)
        await Promise.all(this.modules.map(x => x.transform(this.noprefixRopmAliases)));
    }
    /**
     * Reduce the number of dependencies to only one version for each major.
     * Then, remove unnecessary dependencies
     */
    async reduceModulesAndCreatePrefixMaps() {
        //remove non-valid dependencies
        this.modules = this.modules.filter(x => x.isValid);
        const reducedDependencies = this.getReducedDependencies();
        //discard any modules that are not in the list
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const module = this.modules[i];
            const dep = reducedDependencies.find((dep) => {
                return dep.version === module.version && dep.npmModuleName === module.npmModuleName;
            });
            //remove if not an approved module
            if (!dep) {
                this.modules.splice(i, 1);
            }
        }
        this.noprefixRopmAliases = this.modules.filter(x => this.noprefixNpmAliases.includes(x.npmAliasName)).map(x => x.ropmModuleName);
        //give each module the approved list of dependencies
        await Promise.all(this.modules.map(x => x.createPrefixMap(reducedDependencies)));
    }
    /**
     * Gather the entire list of dependencies, and then reduce them all to the highest minor/patch version within each major.
     * Also derive the optimal ropm alias for each dependency based on the host app aliases and the aliases from all dependencies
     */
    getReducedDependencies() {
        var _a, _b;
        //versions[moduleName][dominantVersion] = highestVersionNumber
        const moduleVersions = {};
        //for each package of the same name, compute the highest version within each major version range
        for (const module of this.modules) {
            const npmModuleNameLower = module.npmModuleName.toLowerCase();
            //make the bucket if not exist
            if (!moduleVersions[npmModuleNameLower]) {
                moduleVersions[npmModuleNameLower] = {};
            }
            const dominantVersion = util_1.util.getDominantVersion(module.version);
            if (!moduleVersions[npmModuleNameLower][dominantVersion]) {
                moduleVersions[npmModuleNameLower][dominantVersion] = {
                    highestVersion: module.version,
                    aliases: []
                };
            }
            const previousVersion = (_a = moduleVersions[npmModuleNameLower][dominantVersion].highestVersion) !== null && _a !== void 0 ? _a : module.version;
            //if this new version is higher, keep it
            if (semver.compare(module.version, previousVersion) > 0) {
                moduleVersions[npmModuleNameLower][dominantVersion].highestVersion = module.version;
            }
            moduleVersions[npmModuleNameLower][dominantVersion].aliases.push(module.ropmModuleName);
        }
        const result = [];
        //compute the list of unique aliases
        for (const moduleName in moduleVersions) {
            const dominantVersions = Object.keys(moduleVersions[moduleName]).sort();
            for (let i = 0; i < dominantVersions.length; i++) {
                const dominantVersion = dominantVersions[i];
                const hostDependency = this.hostDependencies.find(dep => dep.npmModuleName === moduleName && util_1.util.getDominantVersion(dep.version) === dominantVersion);
                const obj = moduleVersions[moduleName][dominantVersion];
                //convert the version number into a valid roku identifier
                const dominantVersionIdentifier = util_1.util.prereleaseToRokuIdentifier(dominantVersion);
                let version;
                if (semver.prerelease(dominantVersion)) {
                    //use exactly this prerelease version
                    version = dominantVersion;
                }
                else {
                    //use the highest version within this major range
                    version = semver.maxSatisfying([obj.highestVersion, (_b = hostDependency === null || hostDependency === void 0 ? void 0 : hostDependency.version) !== null && _b !== void 0 ? _b : '0.0.0'], '*');
                }
                let ropmModuleName;
                if (hostDependency === null || hostDependency === void 0 ? void 0 : hostDependency.npmAlias) {
                    ropmModuleName = util_1.util.getRopmNameFromModuleName(hostDependency.npmAlias);
                }
                else if (dominantVersions.length === 1) {
                    ropmModuleName = util_1.util.getRopmNameFromModuleName(moduleName);
                }
                else {
                    ropmModuleName = `${util_1.util.getRopmNameFromModuleName(moduleName)}_v${dominantVersionIdentifier}`;
                }
                result.push({
                    dominantVersion: dominantVersion.toString(),
                    npmModuleName: moduleName,
                    //use the hosts's alias, or default to the module name
                    ropmModuleName: ropmModuleName,
                    version: version
                });
            }
        }
        return result;
    }
}
exports.ModuleManager = ModuleManager;
//# sourceMappingURL=ModuleManager.js.map