"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fsExtra = require("fs-extra");
const TestHelpers_spec_1 = require("../TestHelpers.spec");
const CleanCommand_1 = require("./CleanCommand");
const chai_1 = require("chai");
const path = require("path");
describe('CleanCommand', () => {
    const appDir = `${TestHelpers_spec_1.tempDir}/app`;
    it('clears empty roku_modules folders', async () => {
        const folders = [
            `${appDir}/source/roku_modules`,
            `${appDir}/components/roku_modules`
        ];
        fsExtra.ensureDirSync(folders[0]);
        fsExtra.ensureDirSync(folders[1]);
        const command = new CleanCommand_1.CleanCommand({
            cwd: appDir
        });
        await command.run();
        chai_1.expect(fsExtra.pathExistsSync(folders[0])).to.be.false;
        chai_1.expect(fsExtra.pathExistsSync(folders[1])).to.be.false;
    });
    it('clears non-empty roku_modules folders', async () => {
        const filePath = `${appDir}/source/roku_modules/promise/file.brs`;
        fsExtra.ensureDirSync(path.dirname(filePath));
        fsExtra.writeFileSync(filePath, '');
        const command = new CleanCommand_1.CleanCommand({
            cwd: appDir
        });
        await command.run();
        chai_1.expect(fsExtra.pathExistsSync(filePath)).to.be.false;
    });
    it('cleans with custom rootDir path', async () => {
        TestHelpers_spec_1.mergePackageJson(appDir, {
            ropm: {
                //specify custom rootDir
                rootDir: `${appDir}/src`
            }
        });
        const filePath = `${appDir}/src/source/roku_modules/promise/file.brs`;
        fsExtra.ensureDirSync(path.dirname(filePath));
        fsExtra.writeFileSync(filePath, '');
        const command = new CleanCommand_1.CleanCommand({
            cwd: appDir
        });
        await command.run();
        chai_1.expect(fsExtra.pathExistsSync(filePath)).to.be.false;
    });
});
//# sourceMappingURL=CleanCommand.spec.js.map