"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeProject = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const fsExtra = require("fs-extra");
const path = require("path");
const util = require("util");
const child_process_1 = require("child_process");
const execPromisified = util.promisify(child_process_1.exec);
const InstallCommand_1 = require("./InstallCommand");
const chai_1 = require("chai");
const TestHelpers_spec_1 = require("../TestHelpers.spec");
const projectName = 'test-project';
const projectDir = path.join(TestHelpers_spec_1.tempDir, projectName);
describe('InstallCommand', () => {
    let args;
    let command;
    beforeEach(() => {
        args = {
            packages: [],
            cwd: projectDir
        };
        command = new InstallCommand_1.InstallCommand(args);
        //make the test project
        fsExtra.ensureDirSync(TestHelpers_spec_1.tempDir);
        fsExtra.emptyDirSync(TestHelpers_spec_1.tempDir);
        fsExtra.ensureDirSync(projectDir);
    });
    afterEach(() => {
        fsExtra.ensureDirSync(TestHelpers_spec_1.tempDir);
        fsExtra.emptyDirSync(TestHelpers_spec_1.tempDir);
    });
    after(() => {
        fsExtra.emptyDirSync(TestHelpers_spec_1.tempDir);
        fsExtra.rmdirSync(TestHelpers_spec_1.tempDir);
    });
    describe('install', () => {
        it('works with local packages', async () => {
            //main project
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            //lib
            writeProject('logger', {
                'source/logger.brs': ''
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
        });
        it('uses dependency package.json ropm.packageRootDir when specified', async () => {
            writeProject('logger', {
                'src/source/logger.brs': ''
            }, {
                ropm: {
                    packageRootDir: 'src'
                }
            });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
        });
        it('honors dependency package.json `files` property', async () => {
            writeProject('logger', {
                'source/logger.brs': '',
                'source/temp.brs': ''
            }, {
                files: [
                    'source/logger.brs'
                ]
            });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
            //temp.brs should not have been copied
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger', 'temp.brs'))).to.be.false;
        });
        it('honors host package.json `ropm.rootDir` property', async () => {
            writeProject('logger', {
                'source/logger.brs': '',
                'source/temp.brs': ''
            });
            writeProject(projectName, {
                'src/source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                },
                ropm: {
                    rootDir: 'src'
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'src', 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'src', 'source', 'roku_modules', 'logger', 'temp.brs'))).to.be.true;
        });
        it('honors rootDir arg over package.json `ropm.rootDir` property', async () => {
            args.rootDir = 'anotherSrc';
            writeProject('logger', {
                'source/logger.brs': '',
                'source/temp.brs': ''
            });
            writeProject(projectName, {
                'anotherSrc/source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                },
                ropm: {
                    rootDir: 'src'
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'anotherSrc', 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'anotherSrc', 'source', 'roku_modules', 'logger', 'temp.brs'))).to.be.true;
        });
        it('uses module directory when `packageRootDir` is omitted', async () => {
            writeProject('logger', {
                'source/logger.brs': '',
                'source/temp.brs': ''
            });
            writeProject(projectName, {
                'src/source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                },
                ropm: {
                    rootDir: 'src'
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'src', 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'src', 'source', 'roku_modules', 'logger', 'temp.brs'))).to.be.true;
        });
        it('works when not passing in any packages', async () => {
            //remove packages
            delete args.packages;
            writeProject(projectName, {
                'source/main.brs': ''
            });
            await command.run();
        });
        it('cleans up before installing', async () => {
            writeProject(projectName, {
                'source/main.brs': '',
                //a "leftover" file from a previous ropm install
                'customDir/roku_modules/testlib/file.brs': ''
            });
            await command.run();
            //the command should have deleted all roku_modules folders
            chai_1.expect(fsExtra.pathExistsSync(path.join(TestHelpers_spec_1.tempDir, projectName, 'customDir', 'roku_modules'))).to.be.false;
            //the command should have deleted empty top-level folders that used to have roku_modules in them
            chai_1.expect(fsExtra.pathExistsSync(path.join(TestHelpers_spec_1.tempDir, projectName, 'customDir'))).to.be.false;
        });
        it('shows underlying error when `npm ls` fails', async () => {
            writeProject(projectName, {
                'source/main.brs': '',
                //a "leftover" file from a previous ropm install
                'customDir/roku_modules/testlib/file.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            let ex;
            try {
                await command.run();
            }
            catch (e) {
                ex = e;
            }
            chai_1.expect(ex.message).to.include('Failed to compute prod dependencies');
        });
        it('ignores prod dependencies that are missing the "ropm" keyword', async () => {
            writeProject('logger', {
                'source/logger.brs': ''
            }, {
                keywords: ['not-ropm']
            });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger'))).to.be.false;
        });
        it('installs nested dependencies', async () => {
            writeProject('maestro', {
                'source/NodeClass.brs': ''
            });
            writeProject('logger', {
                'source/logger.brs': ''
            }, {
                dependencies: {
                    'maestro': `file:../maestro`
                }
            });
            // `npm install` doesn't install dependencies of local dependencies - they have to be installed in dependency directory
            await execPromisified('npm install', { cwd: path.join(TestHelpers_spec_1.tempDir, 'logger') });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'maestro'))).to.be.false;
        });
        it('ignores prod dependencies of prod dependencies that are missing the "ropm" keyword', async () => {
            writeProject('maestro', {
                'source/NodeClass.brs': ''
            }, { keywords: ['non-ropm'] });
            writeProject('logger', {
                'source/logger.brs': ''
            }, {
                dependencies: {
                    'maestro': `file:../maestro`
                }
            });
            // `npm install` doesn't install dependencies of local dependencies - they have to be installed in dependency directory
            await execPromisified('npm install', { cwd: path.join(TestHelpers_spec_1.tempDir, 'logger') });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'maestro'))).to.be.false;
        });
        it('ignores top-level package files', async () => {
            writeProject('logger', {
                'source/logger.brs': '',
                //these files are at the top-level of the project and should be ignored
                'readme.md': '',
                'LICENSE': ''
            });
            writeProject(projectName, {
                'source/main.brs': ''
            }, {
                dependencies: {
                    'logger': `file:../logger`
                }
            });
            await command.run();
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'source', 'roku_modules', 'logger', 'logger.brs'))).to.be.true;
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'readme.md')), 'readme.md should not exist').to.be.false;
            chai_1.expect(fsExtra.pathExistsSync(path.join(projectDir, 'LICENSE')), 'LICENSE should not exist').to.be.false;
        });
        //can't figure out how to make this test work properly. it seems like mocha intercepts stderr so we don't have access to it.
        //strangely enough, the test passes when DEBUGGING, just not when run without debugging.
        it.skip('recovers from pesky "NPM ERR! extraneous" errors', async () => {
            fsExtra.ensureDirSync(`${projectDir}/../annoying/node_modules/sub-annoying`);
            fsExtra.writeFileSync(`${projectDir}/../annoying/package.json`, `{ "name": "annoying", "version": "1.0.0"}`);
            //this is an extraneous node module
            fsExtra.writeFileSync(`${projectDir}/../annoying/node_modules/sub-annoying/package.json`, `{ "name": "sub-annoying", "version": "1.0.0"}`);
            writeProject(projectName, {}, {
                dependencies: {
                    'annoying': 'file:../annoying'
                }
            });
            await command.run();
        });
    });
    it('uses ropm alias instead of npm alias for local dependencies', async () => {
        writeProject('roku-logger', {
            'source/main.brs': `
                sub log()
                end sub
            `
        });
        writeProject(projectName, {}, {
            dependencies: {
                'roku-logger': `file:../roku-logger`
            }
        });
        await command.run();
        TestHelpers_spec_1.fsEqual(`${projectDir}/source/roku_modules/rokulogger/main.brs`, `
            sub rokulogger_log()
            end sub
        `);
    });
    it('does not corrupt class builder names', async () => {
        writeProject('maestro-core', {
            'source/NodeClass.brs': `
                function __NodeClass_builder()
                    instance = {}
                    instance.new = function(globalNode, top)
                        m.global = invalid
                        m.data = invalid
                        m.top = invalid
                        m.global = globalNode
                        m.top = top
                        m.data = top.data
                    end function
                    return instance
                end function
                function NodeClass(globalNode, top)
                    instance = __NodeClass_builder()
                    instance.new(globalNode, top)
                    return instance
                end function
            `
        });
        writeProject('maestro-core', {
            'source/NodeClass.d.bs': `
                class NodeClass
                    public global as dynamic
                    public data as dynamic
                    public top as dynamic
                    function new(globalNode, top)
                    end function
                end class
            `
        });
        writeProject(projectName, {}, {
            dependencies: {
                'mc': `file:../maestro-core`
            }
        });
        await command.run();
        TestHelpers_spec_1.fsEqual(`${projectDir}/source/roku_modules/mc/NodeClass.brs`, `
            function __mc_NodeClass_builder()
                instance = {}
                instance.new = function(globalNode, top)
                    m.global = invalid
                    m.data = invalid
                    m.top = invalid
                    m.global = globalNode
                    m.top = top
                    m.data = top.data
                end function
                return instance
            end function
            function mc_NodeClass(globalNode, top)
                instance = __mc_NodeClass_builder()
                instance.new(globalNode, top)
                return instance
            end function
        `);
    });
    describe('getProdDependencies', () => {
        it('excludes dependencies in folders above cwd for command', () => {
            const [level1, level2, level3] = TestHelpers_spec_1.createProjects(projectDir, projectDir, {
                name: projectName,
                dependencies: [{
                        name: 'level1',
                        dependencies: [{
                                name: 'level2',
                                dependencies: [{
                                        name: 'level3'
                                    }]
                            }]
                    }]
            });
            chai_1.expect(command.getProdDependencies().sort()).to.eql([
                projectDir,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1`,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2`,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2/node_modules/level3`
            ]);
            command = new InstallCommand_1.InstallCommand({ cwd: level1.moduleDir });
            chai_1.expect(command.getProdDependencies().sort()).to.eql([
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1`,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2`,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2/node_modules/level3`
            ]);
            command = new InstallCommand_1.InstallCommand({ cwd: level2.moduleDir });
            chai_1.expect(command.getProdDependencies().sort()).to.eql([
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2`,
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2/node_modules/level3`
            ]);
            command = new InstallCommand_1.InstallCommand({ cwd: level3.moduleDir });
            chai_1.expect(command.getProdDependencies().sort()).to.eql([
                TestHelpers_spec_1.standardizePath `${projectDir}/node_modules/level1/node_modules/level2/node_modules/level3`
            ]);
        });
        it('excludes dependencies in folders above cwd for command', async () => {
            //create a root project, with a dependency
            TestHelpers_spec_1.createProjects(TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject`, TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject`, {
                name: 'outerProject',
                dependencies: [{
                        name: 'outerProjectDependency'
                    }]
            });
            //create a folder inside of root project
            TestHelpers_spec_1.createProjects(TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject/innerProject`, TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject/innerProject`, {
                name: 'innerProject',
                dependencies: [{
                        name: 'innerProjectDependency'
                    }]
            });
            //install outer project
            command.args.cwd = TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject`;
            await command.run();
            const innerCommand = new InstallCommand_1.InstallCommand({
                cwd: TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject/innerProject`
            });
            await innerCommand.run();
            //innerProject should not list outerProject dependencies
            chai_1.expect(innerCommand.getProdDependencies().sort()).to.eql([
                TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject/innerProject`,
                TestHelpers_spec_1.standardizePath `${TestHelpers_spec_1.tempDir}/outerProject/innerProject/node_modules/innerProjectDependency`
            ]);
        });
    });
});
function writeProject(projectName, files, additionalPackageJson) {
    for (const relativePath in files) {
        const filePath = path.join(TestHelpers_spec_1.tempDir, projectName, relativePath);
        fsExtra.ensureDirSync(path.dirname(filePath));
        fsExtra.writeFileSync(filePath, files[relativePath]);
    }
    const packageJson = Object.assign({ name: projectName, version: '1.0.0', description: '', keywords: [
            'ropm'
        ] }, (additionalPackageJson !== null && additionalPackageJson !== void 0 ? additionalPackageJson : {}));
    fsExtra.ensureDirSync(path.join(TestHelpers_spec_1.tempDir, projectName));
    //write the package.json
    fsExtra.writeFileSync(path.join(TestHelpers_spec_1.tempDir, projectName, 'package.json'), JSON.stringify(packageJson));
}
exports.writeProject = writeProject;
//# sourceMappingURL=InstallCommand.spec.js.map