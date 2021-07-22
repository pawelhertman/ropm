export declare class InstallCommand {
    args: InstallCommandArgs;
    constructor(args: InstallCommandArgs);
    private hostPackageJson?;
    private moduleManager;
    private get hostRootDir();
    private get cwd();
    run(runNpmInstall?: boolean): Promise<void>;
    /**
     * Deletes every roku_modules folder found in the hostRootDir
     */
    private deleteAllRokuModulesFolders;
    /**
     * A "host" is the project we are currently operating upon. This method
     * finds the package.json file for the current host
     */
    private loadHostPackageJson;
    private npmInstall;
    /**
     * Copy all modules to roku_modules
     */
    private processModules;
    /**
     * Get the list of prod dependencies from npm.
     * This is run sync because it should run as fast as possible
     * and won't be run in ~parallel.
     */
    getProdDependencies(): string[];
}
export interface InstallCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * The list of packages that should be installed
     */
    packages?: string[];
    /**
     * Dependencies installation location.
     * By default the setting from package.json is imported out-of-the-box, but if rootDir is passed here,
     * it will override the value from package.json.
     */
    rootDir?: string;
}
