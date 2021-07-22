"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestHelpers_spec_1 = require("../TestHelpers.spec");
const fsExtra = require("fs-extra");
const UninstallCommand_1 = require("./UninstallCommand");
const chai_1 = require("chai");
describe('UninstallCommand', () => {
    const appDir = `${TestHelpers_spec_1.tempDir}/app`;
    it('removes from package.json', async () => {
        TestHelpers_spec_1.mergePackageJson(appDir, {
            dependencies: {
                promise: `file:/${TestHelpers_spec_1.tempDir}/proimse`
            }
        });
        TestHelpers_spec_1.mergePackageJson(`${TestHelpers_spec_1.tempDir}/proimse`, {
            name: 'promise',
            version: '1.0.0'
        });
        fsExtra.ensureDirSync(`${appDir}/source/roku_modules/promise`);
        fsExtra.writeFileSync(`${appDir}/source/roku_modules/promise/promise.brs`, '');
        const command = new UninstallCommand_1.UninstallCommand({
            cwd: appDir,
            packages: [
                'promise'
            ]
        });
        await command.run();
        chai_1.expect(fsExtra.pathExistsSync(`${appDir}/source/roku_modules/promise`)).to.be.false;
    });
});
//# sourceMappingURL=UninstallCommand.spec.js.map