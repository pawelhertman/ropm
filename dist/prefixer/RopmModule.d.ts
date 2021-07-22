import { File } from './File';
import type { RopmPackageJson } from '../util';
import type { Dependency } from './ModuleManager';
export declare class RopmModule {
    readonly hostRootDir: string;
    /**
     * The directory at the root of the module. This is the folder where the package.json resides
     */
    readonly moduleDir: string;
    constructor(hostRootDir: string, 
    /**
     * The directory at the root of the module. This is the folder where the package.json resides
     */
    moduleDir: string);
    /**
     * A list of globs that will always be ignored during copy from node_modules to roku_modules
     */
    static readonly fileIgnorePatterns: string[];
    files: File[];
    /**
     * The name of this module. Users can rename modules on install-time, so this is the folder we must use
     */
    npmAliasName: string;
    /**
     * The name of the module directly from the module's package.json. This is used to help resolve dependencies between packages
     * even if an alias is used
     */
    npmModuleName: string;
    /**
     * The version of this current module
     */
    version: string;
    /**
     * The ropm name of this module. ROPM module names are sanitized npm names.
     */
    ropmModuleName: string;
    /**
     * The path where this module's package code resides.
     */
    packageRootDir: string;
    /**
     * A map from the original file location to its new destination.
     * This is set during the copy process.
     */
    fileMaps: Array<{
        src: string;
        dest: string;
    }>;
    /**
     * A map from the prefixes used when this module was published, to the prefix that should be used
     * when this module is installed in the overall project.
     * This depends on the module properly referencing every dependency.
     */
    prefixMap: Record<string, string>;
    /**
     * The contents of the package.json
     */
    packageJson: RopmPackageJson;
    /**
     * The dominant version of the dependency. This will be the major version in most cases, will be the full version string for pre-release versions
     */
    dominantVersion: string;
    isValid: boolean;
    init(): Promise<void>;
    copyFiles(): Promise<void>;
    private program;
    /**
     * @param noprefix a list of npm aliases of modules that should NOT be prefixed
     */
    transform(noprefixRopmAliases: string[]): Promise<void>;
    private readonly nonPrefixedFunctionMap;
    /**
     * Create the prefix map for this module
     * @param programDependencies - the full list of resolved dependencies from the program. This is created by ModuleManager based on all modules in the program.
     */
    createPrefixMap(programDependencies: Dependency[]): Promise<void>;
    private getInterfaceFunctions;
    private createEdits;
    private createFileReferenceEdit;
    /**
     * Scan every file and compute the list of function declaration names.
     */
    getDistinctFunctionDeclarationMap(): Record<string, boolean>;
    /**
     * Get the distinct names of function calls
     */
    getDistinctFunctionCallNames(): string[];
    /**
     * Get the distinct names of component declarations
     */
    getDistinctComponentDeclarationNames(): string[];
    /**
     * Get the distinct names of components used
     */
    getDistinctComponentReferenceNames(): string[];
}
