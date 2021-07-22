/// <reference types="node" />
import * as childProcess from 'child_process';
import type { IOptions } from 'glob';
export declare class Util {
    /**
     * Determine if the current OS is running a version of windows
     */
    private isWindowsPlatform;
    /**
     * Executes an exec command and returns a promise that completes when it's finished
     */
    spawnAsync(command: string, args?: string[], options?: childProcess.SpawnOptions): Promise<unknown>;
    /**
     * Spawn an npm command and return a promise.
     * This is necessary because spawn requires the file extension (.cmd) on windows.
     * @param args - the list of args to pass to npm. Any undefined args will be removed from the list, so feel free to use ternary outside to simplify things
     */
    spawnNpmAsync(args: Array<string | undefined>, options?: childProcess.SpawnOptions): Promise<unknown>;
    getUserInput(question: string): Promise<string>;
    /**
     * Given a full path to a node module, calculate the module's name.
     */
    getModuleName(modulePath: string): string | undefined;
    /**
     * Given the name of a node module (`module`, `some-module`, `some_module`, `@namespace/some-module`, etc...),
     * return the ropm-safe version of that module.
     * This will remove dashes, @ symbols, and many other invalid characters, convert slashes into underscores.
     * If a name starts with a number, prefix with underscore
     */
    getRopmNameFromModuleName(moduleName: string): string;
    /**
     * Get the package.json as an object
     */
    getPackageJson(modulePath: string): Promise<RopmPackageJson>;
    /**
     * Determine if the directory is empty or not
     */
    isEmptyDir(dirPath: string): Promise<boolean>;
    /**
     * A promise wrapper around glob-all
     */
    globAll(patterns: any, options?: IOptions): Promise<string[]>;
    /**
     * Copy a set of files
     */
    copyFiles(files: Array<{
        src: string;
        dest: string;
    }>): Promise<void>;
    /**
     * Given a path to a module within node_modules, return its list of direct dependencies
     */
    getModuleDependencies(moduleDir: string): Promise<ModuleDependency[]>;
    /**
     * Given a full verison string that ends with a prerelease text,
     * convert that into a valid roku identifier. This is unique in that we want
     * the identifier to still be version number-ish.
     */
    prereleaseToRokuIdentifier(preversion: string): string;
    /**
     * Given the path to a folder containing a node_modules folder, find the path to the specified package
     * First look in ${startingDir}/node_modules. Then, walk up the directory tree,
     * looking in node_modules for that folder the whole way up to root.
     */
    findDependencyDir(startingDir: string, packageName: string): Promise<string | undefined>;
    /**
     * Replace the first case-insensitive occurance of {search} in {subject} with {replace}
     */
    replaceCaseInsensitive(search: string, subject: string, replace: string): string;
    /**
     * If the text starts with a slash, remove it
     */
    removeLeadingSlash(text: string): string;
    /**
     * Get the dominant version for a given version. This is the major number for normal versions,
     * or the entire version string for prerelease versions
     */
    getDominantVersion(version: string): string;
    /**
     * Determine if a string has the same number of open parens as it does close parens
     */
    hasMatchingParenCount(text: string): boolean;
    /**
     * Replaces the Program.validate call with an empty function.
     * This allows us to bypass BrighterScript's validation cycle, which speeds up performace
     */
    mockProgramValidate(): void;
    /**
     * Get the base namespace from a namespace statement, or undefined if there are no dots
     */
    getBaseNamespace(text: string): string | undefined;
}
export declare const util: Util;
export interface RopmPackageJson {
    name: string;
    dependencies?: Record<string, string>;
    files?: string[];
    keywords?: string[];
    version: string;
    ropm?: RopmOptions;
}
export interface RopmOptions {
    /**
     * The path to the rootDir of the project where `ropm` should install all ropm modules
     */
    rootDir?: string;
    /**
     * The path to the rootDir of the a ropm module's package files. Use this if your module stores files in a subdirectory.
     * NOTE: This should only be used by ropm package AUTHORS
     */
    packageRootDir?: string;
    /**
     * An array of module aliases that should not be prefixed when installed into `rootDir`. Use this with caution.
     */
    noprefix?: string[];
}
export interface ModuleDependency {
    npmAlias: string;
    ropmModuleName: string;
    npmModuleName: string;
    version: string;
}
