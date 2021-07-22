"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyCommand = void 0;
const InstallCommand_1 = require("./InstallCommand");
class CopyCommand {
    constructor(args) {
        this.args = args;
    }
    async run() {
        const installCommand = new InstallCommand_1.InstallCommand(this.args);
        await installCommand.run(false);
    }
}
exports.CopyCommand = CopyCommand;
//# sourceMappingURL=CopyCommand.js.map