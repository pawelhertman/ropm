"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const sinon = sinon_1.createSandbox();
const TestHelpers_spec_1 = require("../TestHelpers.spec");
const util_1 = require("../util");
const InitCommand_1 = require("./InitCommand");
const fsExtra = require("fs-extra");
describe('InitCommand', () => {
    let command;
    let args;
    const cwd = TestHelpers_spec_1.tempDir;
    beforeEach(() => {
        args = {
            cwd: cwd
        };
        command = new InitCommand_1.InitCommand(args);
    });
    afterEach(() => {
        sinon.restore();
    });
    it('prompts for rootDir on fresh install with no package.json present', async () => {
        const stub = sinon.stub(util_1.util, 'getUserInput').returns(Promise.resolve('abc'));
        //no-op npm for this test
        sinon.stub(util_1.util, 'spawnNpmAsync').returns(Promise.resolve());
        await command.run();
        chai_1.expect(stub.callCount).to.equal(1);
        chai_1.expect(fsExtra.readJsonSync(`${cwd}/package.json`)).to.eql({
            ropm: {
                rootDir: 'abc'
            }
        });
    });
    it('prompts for rootDir on fresh install package.json present, but no ropm.rootDir key', async () => {
        fsExtra.writeJsonSync(`${cwd}/package.json`, {});
        const stub = sinon.stub(util_1.util, 'getUserInput').returns(Promise.resolve('abc'));
        //no-op npm for this test
        sinon.stub(util_1.util, 'spawnNpmAsync').returns(Promise.resolve());
        await command.run();
        chai_1.expect(stub.callCount).to.equal(1);
        chai_1.expect(fsExtra.readJsonSync(`${cwd}/package.json`)).to.eql({
            ropm: {
                rootDir: 'abc'
            }
        });
    });
    it('does not prompt for rootDir when ropm.rootDir exists in package.json', async () => {
        fsExtra.writeJsonSync(`${cwd}/package.json`, {
            ropm: {
                rootDir: '123'
            }
        });
        const stub = sinon.stub(util_1.util, 'getUserInput').returns(Promise.resolve('abc'));
        //no-op npm for this test
        sinon.stub(util_1.util, 'spawnNpmAsync').returns(Promise.resolve());
        await command.run();
        chai_1.expect(stub.callCount).to.equal(0);
        chai_1.expect(fsExtra.readJsonSync(`${cwd}/package.json`)).to.eql({
            ropm: {
                rootDir: '123'
            }
        });
    });
});
//# sourceMappingURL=InitCommand.spec.js.map