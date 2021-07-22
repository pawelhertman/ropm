export declare class CleanCommand {
    args: CleanCommandArgs;
    constructor(args: CleanCommandArgs);
    private hostPackageJson?;
    private get hostRootDir();
    /**
     * Determine if we should load the host package.json from disk or not
     */
    private get skipLoadHostPackageJson();
    /**
     * A "host" is the project we are currently operating upon. This method
     * finds the package.json file for the current host
     */
    private loadHostPackageJson;
    run(): Promise<void>;
    private deleteAllRokuModulesFolders;
    private get cwd();
}
export interface CleanCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * The path to the root directory for the project that should be cleaned
     */
    rootDir?: string;
}
