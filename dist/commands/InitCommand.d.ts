export declare class InitCommand {
    args: InitCommandArgs;
    constructor(args: InitCommandArgs);
    run(): Promise<void>;
    private get cwd();
    private get force();
    private get promptForRootDir();
    /**
     * If the package.json is missing `ropm.rootDir`, prompt user for that info
     */
    private getRootDirFromUser;
}
export interface InitCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * If true, then generate without any questions
     */
    force?: boolean;
    /**
     * This overrides `force` for rootDir, but only if present
     */
    promptForRootDir?: boolean;
}
