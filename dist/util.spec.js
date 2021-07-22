"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sinon = void 0;
const util_1 = require("./util");
const fsExtra = require("fs-extra");
const chai_1 = require("chai");
const childProcess = require("child_process");
const sinon_1 = require("sinon");
const TestHelpers_spec_1 = require("./TestHelpers.spec");
exports.sinon = sinon_1.createSandbox();
const path = require("path");
describe('Util', () => {
    beforeEach(() => {
        exports.sinon.restore();
    });
    describe('getModuleName', () => {
        it('finds non-namespace names', () => {
            chai_1.expect(util_1.util.getModuleName('fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('some_folder/fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('some_folder\\fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('../fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('..\\fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('C:\\projects\\some_folder\\fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('C:/projects/some_folder/fs-extra')).to.equal('fs-extra');
            chai_1.expect(util_1.util.getModuleName('/usr/someone/projects/some_folder/fs-extra')).to.equal('fs-extra');
        });
        it('finds namespaced names from module names', () => {
            chai_1.expect(util_1.util.getModuleName('@namespace/fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('@namespace\\fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('../@namespace/fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('..\\@namespace\\fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('C:\\projects\\@namespace\\fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('C:/projects/@namespace/fs-extra')).to.equal('@namespace/fs-extra');
            chai_1.expect(util_1.util.getModuleName('/usr/someone/projects/@namespace/fs-extra')).to.equal('@namespace/fs-extra');
        });
        it('returns undefined for invalid or empty input', () => {
            chai_1.expect(util_1.util.getModuleName('')).to.be.undefined;
            chai_1.expect(util_1.util.getModuleName(false)).to.be.undefined;
            chai_1.expect(util_1.util.getModuleName({})).to.be.undefined;
        });
    });
    describe('getRopmNameFromModuleName', () => {
        it('does nothing with already-valid names', () => {
            chai_1.expect(util_1.util.getRopmNameFromModuleName('module')).to.equal('module');
            chai_1.expect(util_1.util.getRopmNameFromModuleName('module_1')).to.equal('module_1');
            chai_1.expect(util_1.util.getRopmNameFromModuleName('some_module')).to.equal('some_module');
        });
        it('replaces invalid characters', () => {
            chai_1.expect(util_1.util.getRopmNameFromModuleName('@company')).to.equal('company');
            chai_1.expect(util_1.util.getRopmNameFromModuleName('.:module')).to.equal('module');
            chai_1.expect(util_1.util.getRopmNameFromModuleName('mod-ule')).to.equal('module');
            chai_1.expect(util_1.util.getRopmNameFromModuleName(' module ')).to.equal('module');
            chai_1.expect(util_1.util.getRopmNameFromModuleName('\tmodule ')).to.equal('module');
        });
        it('handles scoped packages properly', () => {
            chai_1.expect(util_1.util.getRopmNameFromModuleName('@company/module')).to.equal('company_module');
        });
        it('prefixes number-first names with underscore', () => {
            chai_1.expect(util_1.util.getRopmNameFromModuleName('123module')).to.equal('_123module');
        });
        it('converts nonstandard alpha characters into standard onces', () => {
            chai_1.expect(util_1.util.getRopmNameFromModuleName('ỆᶍǍᶆṔƚÉáéíóúýčďěňřšťžů')).to.equal('exampleaeiouycdenrstzu');
        });
    });
    describe('spawnAsnc', () => {
        it('uses an empty object if not specified', async () => {
            const stub = exports.sinon.stub(childProcess, 'spawn').callsFake(() => {
                return {
                    addListener: (name, callback) => {
                        if (name === 'exit') {
                            setTimeout(() => callback(), 1);
                        }
                    }
                };
            });
            await util_1.util.spawnAsync('noop');
            chai_1.expect(stub.getCalls()[0].args).to.eql([
                'noop', [], { stdio: 'inherit' }
            ]);
        });
    });
    describe('spawnNpmAsync', () => {
        it('uses `npm.cmd` on windows', async () => {
            const stub = exports.sinon.stub(util_1.util, 'spawnAsync').callsFake(() => {
                return Promise.resolve();
            });
            exports.sinon.stub(util_1.util, 'isWindowsPlatform').returns(true);
            await util_1.util.spawnNpmAsync(['arg']);
            chai_1.expect(stub.getCalls()[0].args[0]).to.eql('npm.cmd');
        });
        it('uses `npm` on non-windows', async () => {
            const stub = exports.sinon.stub(util_1.util, 'spawnAsync').callsFake(() => {
                return Promise.resolve();
            });
            exports.sinon.stub(util_1.util, 'isWindowsPlatform').returns(false);
            await util_1.util.spawnNpmAsync(['arg']);
            chai_1.expect(stub.getCalls()[0].args[0]).to.eql('npm');
        });
    });
    describe('globAll', () => {
        it('rejects on error', async () => {
            //passing undefined results in an error
            await TestHelpers_spec_1.expectThrowsAsync(() => util_1.util.globAll(undefined));
        });
    });
    describe('copyFiles', () => {
        it('throws if failed to copy reaches threshold', async () => {
            //create a file with the same name as the target folder (this should trigger an error)
            fsExtra.ensureDirSync(`${TestHelpers_spec_1.tempDir}/dest`);
            fsExtra.writeFileSync(`${TestHelpers_spec_1.tempDir}/src`, '');
            await TestHelpers_spec_1.expectThrowsAsync(() => util_1.util.copyFiles([{
                    src: `${TestHelpers_spec_1.tempDir}/src`,
                    dest: `${TestHelpers_spec_1.tempDir}/dest`
                }]));
        });
    });
    describe('getModuleDependencies', () => {
        it('throws when dependency is missing', async () => {
            const hostDir = `${TestHelpers_spec_1.tempDir}/project-a`;
            TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'project-a',
                dependencies: [{
                        name: 'project-b'
                    }]
            });
            fsExtra.removeSync(`${hostDir}/node_modules/project-b`);
            await TestHelpers_spec_1.expectThrowsAsync(() => util_1.util.getModuleDependencies(hostDir));
        });
        it('properly handles ropm aliases', async () => {
            const hostDir = path.join(TestHelpers_spec_1.tempDir, 'app');
            TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'app',
                dependencies: [{
                        name: 'project-abc'
                    }]
            });
            const deps = await util_1.util.getModuleDependencies(hostDir);
            chai_1.expect(deps).to.eql([{
                    npmAlias: 'project-abc',
                    ropmModuleName: 'projectabc',
                    npmModuleName: 'project-abc',
                    version: '1.0.0'
                }]);
        });
    });
    describe('findDependencyDir', () => {
        it('throws when dependency is missing', async () => {
            const hostDir = `${TestHelpers_spec_1.tempDir}/project-a`;
            TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'project-a',
                dependencies: [{
                        name: 'project-b'
                    }]
            });
            fsExtra.removeSync(`${hostDir}/node_modules/project-b`);
            chai_1.expect(await util_1.util.findDependencyDir(hostDir, 'project-b')).to.be.undefined;
        });
    });
});
//# sourceMappingURL=util.spec.js.map