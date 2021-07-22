import { RopmModule } from './RopmModule';
import type { ModuleDependency } from '../util';
export declare class ModuleManager {
    modules: RopmModule[];
    /**
     * A list of all direct dependencies of the host application.
     * This is used to pick which version prettier prefixes whenever there's multiple versions required
     */
    hostDependencies: ModuleDependency[];
    /**
     * The absolute path to the rootDir of the host application
     */
    hostRootDir: string;
    /**
     * A list of npm aliases of modules that should not have their source code prefixed during ropm install.
     * This is the npm alias name.
     */
    noprefixNpmAliases: string[];
    /**
     * A list of ropm aliases of modules that should not have their source code prefixed during ropm install.
     * This is the ropm alias name, and is only resolved later in the process so don't use this unless you know for sure it is populated
     */
    private noprefixRopmAliases;
    /**
     * Add a new project to the prefixer
     * @param filePaths the list of absolute file paths for this project
     * @param prefix the prefix to give all of this module's own functions and components (and their internal usage)
     * @param prefixMap if this module has its own dependencies, then this prefix map allows us to rename those prefixes
     */
    addModule(modulePath: string): void;
    /**
     * Initialize all modules
     */
    process(): Promise<void>;
    /**
     * Reduce the number of dependencies to only one version for each major.
     * Then, remove unnecessary dependencies
     */
    reduceModulesAndCreatePrefixMaps(): Promise<void>;
    /**
     * Gather the entire list of dependencies, and then reduce them all to the highest minor/patch version within each major.
     * Also derive the optimal ropm alias for each dependency based on the host app aliases and the aliases from all dependencies
     */
    getReducedDependencies(): Dependency[];
}
export interface Dependency {
    npmModuleName: string;
    /**
     * The dominant version of the dependency. This will be the major version in most cases, will be the full version string for pre-release versions
     */
    dominantVersion: string;
    version: string;
    ropmModuleName: string;
}
