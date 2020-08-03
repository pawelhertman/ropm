import { util } from '../util';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as childProcess from 'child_process';

export class InstallCommand {
    constructor(
        public args: InstallCommandArgs
    ) {

    }

    private get cwd() {
        return this.args.cwd ?? process.cwd();
    }

    /**
     * A list of globs that will always be ignored during copy from node_modules to roku_modules
     */
    static readonly fileIgnorePatterns = [
        '!**/package.json',
        '!./README',
        '!./CHANGES',
        '!./CHANGELOG',
        '!./HISTORY',
        '!./LICENSE',
        '!./LICENCE',
        '!./NOTICE',
        '!**/.git',
        '!**/.svn',
        '!**/.hg',
        '!**/.lock-wscript',
        '!**/.*.swp',
        '!**/.DS_Store',
        '!**/npm-debug.log',
        '!**/.npmrc',
        '!**/node_modules',
        '!**/config.gypi',
        '!**/*.orig',
        '!**/package-lock.json'
    ];

    public async run(): Promise<void> {
        await this.npmInstall();
        await this.copyAllModulesToRokuModules();
    }

    private async npmInstall() {
        await util.spawnNpmAsync([
            'i',
            ...this.args.packages
        ], {
            cwd: this.cwd
        });
    }

    /**
     * Copy all modules to roku_modules
     */
    private async copyAllModulesToRokuModules() {
        let modulePaths = this.getProdDependencies();

        //copy all of them at once, wait for them all to complete
        return Promise.all(
            modulePaths.map((modulePath) => this.copyModuleToRokuModules(modulePath))
        );
    }

    /**
     * Copy a specific module to roku_modules
     */
    private async copyModuleToRokuModules(modulePath: string) {
        let moduleName = util.getModuleName(modulePath) as string;
        //skip modules that we can't derive a name from
        if (!moduleName) {
            return;
        }
        let packageJson = await util.getPackageJson(modulePath);
        let files: string[];
        if (packageJson.ropm?.files) {
            files = [
                packageJson.ropm.files,
                ...InstallCommand.fileIgnorePatterns
            ];
        } else {
            files = [
                '**/*',
                ...InstallCommand.fileIgnorePatterns
            ];
        }
        console.log(`Copying ${moduleName}`);
        let filePaths = await util.globAll(files, {
            cwd: modulePath,
            dot: true,
            //skip matching folders (we'll handle file copying ourselves)
            nodir: true
        });
        //copy all the files from this package
        await Promise.all(
            filePaths.map(async (filePathRelative) => {
                let targetPath = path.join(this.cwd, 'roku_modules', moduleName, filePathRelative);
                //make sure the target folder exists
                await fsExtra.ensureDir(
                    path.dirname(targetPath)
                );
                //copy the file
                await fsExtra.copy(
                    path.join(modulePath, filePathRelative),
                    targetPath,
                    {
                        //dereference symlinks
                        dereference: true
                    }
                );
            })
        );
    }

    /**
     * Get the list of prod dependencies from npm.
     * This is run sync because it should run as fast as possible
     * and won't be run in ~parallel.
     */
    getProdDependencies() {
        let stdout = childProcess.execSync('npm ls --parseable --prod', {
            cwd: this.cwd
        }).toString();
        return stdout.trim().split(/\r?\n/);
    }
}

export interface InstallCommandArgs {
    /**
     * The current working directory for the command.
     */
    cwd?: string;
    /**
     * The list of packages that should be installed
     */
    packages: string[];
}