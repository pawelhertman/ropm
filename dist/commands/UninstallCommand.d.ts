export declare class UninstallCommand {
    args: UninstallCommandArgs;
    constructor(args: UninstallCommandArgs);
    private get cwd();
    run(): Promise<void>;
    private npmUninstall;
    /**
     * Should be run after an uninstall
     */
    private npmInstall;
}
export interface UninstallCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * The list of packages that should be uninstalled
     */
    packages: string[];
}
