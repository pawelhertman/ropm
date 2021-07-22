export declare class CopyCommand {
    args: CopyCommandArgs;
    constructor(args: CopyCommandArgs);
    run(): Promise<void>;
}
export interface CopyCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * Dependencies installation location
     */
    rootDir?: string;
}
