#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-floating-promises */
const yargs = require("yargs");
const InstallCommand_1 = require("./commands/InstallCommand");
const InitCommand_1 = require("./commands/InitCommand");
const CleanCommand_1 = require("./commands/CleanCommand");
const UninstallCommand_1 = require("./commands/UninstallCommand");
const CopyCommand_1 = require("./commands/CopyCommand");
new Promise((resolve, reject) => {
    // eslint-disable-next-line
    yargs
        .command('init', 'Initialize a new package.json file for ropm', (builder) => {
        return builder
            .option('cwd', { type: 'string', description: 'The current working directory that should be used to run the command' })
            .option('force', { type: 'boolean', description: 'Skip all questions', default: false })
            .alias('f', 'force')
            .alias('yes', 'force')
            .alias('y', 'force');
    }, (args) => {
        const command = new InitCommand_1.InitCommand(args);
        command.run().then(resolve, reject);
    })
        .command([
        'install [packages..]',
        'i'
    ], 'Download Roku dependencies into the roku_modules folder', (builder) => {
        return builder
            .option('cwd', { type: 'string', description: 'The current working directory that should be used to run the command' });
    }, (args) => {
        console.error('running');
        const command = new InstallCommand_1.InstallCommand(args);
        command.run().then(resolve, reject);
    })
        .command('clean', 'Remove all roku_module files and folders from the root directory', (builder) => {
        return builder
            .option('cwd', { type: 'string', description: 'The current working directory that should be used to run the command' });
    }, (args) => {
        const command = new CleanCommand_1.CleanCommand(args);
        command.run().then(resolve, reject);
    })
        .command('copy', 'Runs `clean` and then installs all ropm modules. Operates solely with the modules already downloaded, and will not download new modules from the registry.', (builder) => {
        return builder
            .option('cwd', { type: 'string', description: 'The current working directory that should be used to run the command' });
    }, (args) => {
        const command = new CopyCommand_1.CopyCommand(args);
        command.run().then(resolve, reject);
    })
        .command([
        'uninstall [packages..]',
        'un', 'unlink', 'remove', 'rm', 'r'
    ], 'Uninstall the specified dependencies', (builder) => {
        return builder
            .option('cwd', { type: 'string', description: 'The current working directory that should be used to run the command' });
    }, (args) => {
        const command = new UninstallCommand_1.UninstallCommand(args);
        command.run().then(resolve, reject);
    })
        .argv;
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map