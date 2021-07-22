"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RopmModule_1 = require("./RopmModule");
const TestHelpers_spec_1 = require("../TestHelpers.spec");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const util_1 = require("../util");
const sinon = sinon_1.createSandbox();
const hostDir = `${TestHelpers_spec_1.tempDir}/host`;
describe('RopmModule', () => {
    afterEach(() => {
        sinon.restore();
    });
    describe('init', () => {
        it('invalidates with missing alias name', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger'
                    }]
            });
            logger.npmAliasName = undefined;
            await logger.init();
            chai_1.expect(logger.isValid).to.be.false;
        });
        it('computes dominantVersion properly for prerelease', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger',
                        version: '1.2.3-beta.1'
                    }]
            });
            await logger.init();
            chai_1.expect(logger.dominantVersion).to.equal('1.2.3-beta.1');
        });
        it('invalidates with missing alias name', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger'
                    }]
            });
            TestHelpers_spec_1.mergePackageJson(logger.moduleDir, {
                //blank out the name
                name: ''
            });
            const module = new RopmModule_1.RopmModule(hostDir, logger.moduleDir);
            await module.init();
            chai_1.expect(module.isValid).to.be.false;
        });
        it('handles missing `keywords` array', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger'
                    }]
            });
            TestHelpers_spec_1.mergePackageJson(logger.moduleDir, {
                keywords: undefined
            });
            const module = new RopmModule_1.RopmModule(hostDir, logger.moduleDir);
            await module.init();
            chai_1.expect(module.isValid).to.be.false;
        });
    });
    describe('createPrefixMap', () => {
        it('throws when missing own dependency', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger'
                    }]
            });
            await TestHelpers_spec_1.expectThrowsAsync(() => logger.createPrefixMap([]));
        });
        it('throws when missing dependency', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger',
                        dependencies: [{
                                name: 'promise'
                            }]
                    }]
            });
            await logger.init();
            //NOTE: omitted program dependency for `promise`
            await TestHelpers_spec_1.expectThrowsAsync(() => logger.createPrefixMap([{
                    dominantVersion: '1',
                    version: '1.0.0',
                    npmModuleName: 'logger',
                    ropmModuleName: 'logger'
                }]), `Cannot find suitable program dependency for promise@1.0.0`);
        });
        it('properly handles prerelease versions', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger',
                        dependencies: [{
                                name: 'promise',
                                version: '2.0.0-beta.1'
                            }]
                    }]
            });
            await logger.init();
            //does not throw exception for prerelease promise lib
            await logger.createPrefixMap([{
                    npmModuleName: 'logger',
                    ropmModuleName: 'logger',
                    version: '1.0.0',
                    dominantVersion: '1'
                }, {
                    npmModuleName: 'promise',
                    ropmModuleName: 'promise',
                    version: '2.0.0-beta.1',
                    dominantVersion: '2.0.0-beta.1'
                }]);
        });
        it('error includes npm alias and original module name', async () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'real-name',
                        alias: 'alias'
                    }]
            });
            logger.npmModuleName = 'logger';
            let error;
            try {
                sinon.stub(util_1.util, 'getModuleDependencies').returns(Promise.resolve([{ npmAlias: 'alias', npmModuleName: 'real-name', version: '1.0.0' }]));
                await logger.createPrefixMap([{ npmModuleName: 'logger' }]);
            }
            catch (e) {
                error = e;
            }
            chai_1.expect(error === null || error === void 0 ? void 0 : error.message).to.include('alias(real-name)');
        });
    });
    describe('getDistinctFunctionCallNames', () => {
        it('works', () => {
            const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
                name: 'host',
                dependencies: [{
                        name: 'logger'
                    }]
            });
            logger.files = [{
                    functionReferences: [{
                            name: 'Main'
                        }]
                }, {
                    functionReferences: [{
                            name: 'Main'
                        }]
                }];
            chai_1.expect(logger.getDistinctFunctionCallNames()).to.eql(['main']);
        });
    });
    describe('getDistinctComponentReferenceNames', () => {
        const [logger] = TestHelpers_spec_1.createProjects(hostDir, hostDir, {
            name: 'host',
            dependencies: [{
                    name: 'logger'
                }]
        });
        logger.files = [{
                componentReferences: [{
                        name: 'Component1'
                    }]
            }, {
                componentReferences: [{
                        name: 'Component1'
                    }]
            }];
        chai_1.expect(logger.getDistinctComponentReferenceNames()).to.eql(['component1']);
    });
});
//# sourceMappingURL=RopmModule.spec.js.map