"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProcess = exports.pick = exports.standardizePath = exports.expectThrowsAsync = exports.createProjects = exports.trim = exports.fsEqual = exports.mergePackageJson = exports.file = exports.tempDir = exports.sinon = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
const sinon_1 = require("sinon");
const chai_1 = require("chai");
const RopmModule_1 = require("./prefixer/RopmModule");
const rokuDeploy = require("roku-deploy");
const ModuleManager_1 = require("./prefixer/ModuleManager");
const util_1 = require("./util");
exports.sinon = sinon_1.createSandbox();
exports.tempDir = path.join(process.cwd(), '.tmp');
beforeEach(() => {
    fsExtra.ensureDirSync(exports.tempDir);
    fsExtra.emptyDirSync(exports.tempDir);
});
afterEach(() => {
    fsExtra.ensureDirSync(exports.tempDir);
    fsExtra.emptyDirSync(exports.tempDir);
    fsExtra.removeSync(exports.tempDir);
    exports.sinon.restore();
});
function file(filePath, contents) {
    fsExtra.ensureDirSync(path.dirname(filePath));
    fsExtra.writeFileSync(filePath, contents);
}
exports.file = file;
function mergePackageJson(dir, data) {
    var _a, _b;
    const filePath = path.join(dir, 'package.json');
    let packageJson = JSON.parse(fsExtra.pathExistsSync(filePath) ? fsExtra.readFileSync(filePath).toString() : '{}');
    packageJson = Object.assign(Object.assign(Object.assign({}, packageJson), data), { 
        //deep merge dependencies
        dependencies: Object.assign(Object.assign({}, ((_a = packageJson === null || packageJson === void 0 ? void 0 : packageJson.dependencies) !== null && _a !== void 0 ? _a : {})), ((_b = data === null || data === void 0 ? void 0 : data.dependencies) !== null && _b !== void 0 ? _b : {})) });
    fsExtra.ensureDirSync(dir);
    fsExtra.writeFileSync(filePath, JSON.stringify(packageJson));
}
exports.mergePackageJson = mergePackageJson;
function fsEqual(path, expectedText) {
    chai_1.expect(trimLeading(fsExtra.readFileSync(path).toString())).to.exist.and.to.equal(trimLeading(expectedText));
}
exports.fsEqual = fsEqual;
function trim(strings, ...args) {
    let text = '';
    for (let i = 0; i < strings.length; i++) {
        text += strings[i];
        if (args[i]) {
            text += args[i];
        }
    }
    return trimLeading(text);
}
exports.trim = trim;
/**
 * Helper function to scaffold a project with nested dependencies
 */
function createProjects(hostDir, moduleDir, node) {
    var _a, _b, _c, _d, _e, _f, _g;
    const result = [];
    //write the package.json for this node
    const packageJson = Object.assign(Object.assign({}, node), { name: node.name, version: (_a = node.version) !== null && _a !== void 0 ? _a : '1.0.0', keywords: ['ropm'], dependencies: {} });
    delete packageJson._files;
    for (const relativePath in (_b = node._files) !== null && _b !== void 0 ? _b : {}) {
        const absolutePath = path.join(moduleDir, relativePath);
        fsExtra.ensureDirSync(path.dirname(absolutePath));
        fsExtra.writeFileSync(absolutePath, (_d = (_c = node._files) === null || _c === void 0 ? void 0 : _c[relativePath]) !== null && _d !== void 0 ? _d : '');
    }
    const innerProjects = [];
    for (const dependency of (_e = node === null || node === void 0 ? void 0 : node.dependencies) !== null && _e !== void 0 ? _e : []) {
        const alias = (_f = dependency.alias) !== null && _f !== void 0 ? _f : dependency.name;
        packageJson.dependencies[alias] = (_g = dependency.version) !== null && _g !== void 0 ? _g : '1.0.0';
        innerProjects.push(...createProjects(hostDir, path.join(moduleDir, 'node_modules', alias), dependency));
    }
    mergePackageJson(moduleDir, packageJson);
    if (hostDir !== moduleDir) {
        result.push(new RopmModule_1.RopmModule(hostDir, moduleDir));
    }
    result.push(...innerProjects);
    return result;
}
exports.createProjects = createProjects;
/**
 * Trim leading whitespace for every line (to make test writing cleaner)
 */
function trimLeading(text) {
    var _a;
    if (!text) {
        return text;
    }
    const lines = text.split(/\r?\n/);
    let minIndent = Number.MAX_SAFE_INTEGER;
    //skip leading empty lines
    while (((_a = lines[0]) === null || _a === void 0 ? void 0 : _a.trim().length) === 0) {
        lines.splice(0, 1);
    }
    for (const line of lines) {
        const trimmedLine = line.trimLeft();
        //skip empty lines
        if (trimmedLine.length === 0) {
            continue;
        }
        const leadingSpaceCount = line.length - trimmedLine.length;
        if (leadingSpaceCount < minIndent) {
            minIndent = leadingSpaceCount;
        }
    }
    //apply the trim to each line
    for (let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].substring(minIndent);
    }
    return lines.join('\n');
}
async function expectThrowsAsync(func, startingText) {
    let ex;
    try {
        await Promise.resolve(func());
    }
    catch (e) {
        ex = e;
    }
    if (!ex) {
        throw new Error('Expected exception to be thrown');
    }
    //if starting text was provided, then the lower error message must start with that text, or this test will fail
    if (startingText && !ex.message.toLowerCase().startsWith(startingText.toLowerCase())) {
        throw new Error(`Expected error message '${ex.message}' to start with '${startingText}'`);
    }
}
exports.expectThrowsAsync = expectThrowsAsync;
/**
 * A tagged template literal function for standardizing the path.
 */
function standardizePath(stringParts, ...expressions) {
    const result = [];
    for (let i = 0; i < stringParts.length; i++) {
        result.push(stringParts[i], expressions[i]);
    }
    return rokuDeploy.standardizePath(result.join(''));
}
exports.standardizePath = standardizePath;
function pick(objects, ...properties) {
    const results = [];
    for (const obj of objects) {
        const result = {};
        for (const property of properties) {
            result[property] = obj[property];
        }
        results.push(result);
    }
    return results;
}
exports.pick = pick;
/**
 * Streamlined way to test the ModuleManager.process functionality
 * The key is in the format `moduleName:path/to/file.ext`. You can specify an alias by doing `alias@moduleName:path/to/file.ext`
 */
async function testProcess(args) {
    var _a, _b;
    const manager = new ModuleManager_1.ModuleManager();
    const hostDir = path.join(process.cwd(), '.tmp', 'hostApp');
    const noprefixNpmAliases = ((_a = args['noprefixNpmAliases']) !== null && _a !== void 0 ? _a : []);
    delete args['noprefixNpmAliases'];
    const dependencies = [];
    const expectedFileMap = new Map();
    for (const fileKey in args) {
        const [source, expected] = args[fileKey];
        const parts = fileKey.split(':');
        let [dependencyName, filePath] = parts;
        let alias = dependencyName;
        //you can specify an alias by typing alias@originalName
        const nameParts = dependencyName.split('@');
        if (nameParts.length > 1) {
            dependencyName = nameParts[1];
            alias = nameParts[0];
        }
        let dep = dependencies.find(x => x.name === dependencyName);
        if (!dep) {
            dep = {
                name: dependencyName,
                alias: dependencyName !== alias ? alias : undefined,
                _files: {}
            };
            dependencies.push(dep);
        }
        dep._files[filePath] = source;
        //only set if we have an expected value (undefined means "don't test this one")
        if (expected) {
            expectedFileMap.set(filePath, expected);
        }
    }
    manager.modules = createProjects(hostDir, hostDir, {
        name: 'host',
        dependencies: dependencies
    });
    manager.hostDependencies = await util_1.util.getModuleDependencies(hostDir);
    manager.noprefixNpmAliases = noprefixNpmAliases;
    await manager.process();
    //copmare each output file to the expected
    for (const dep of dependencies) {
        for (const filePath in dep._files) {
            const parts = filePath.split('/');
            const baseFolder = parts.shift();
            const remainingPath = parts.join('/');
            const destinationPath = `${hostDir}/${baseFolder}/roku_modules/${(_b = dep.alias) !== null && _b !== void 0 ? _b : dep.name}/${remainingPath}`;
            //only test if we have an expected value
            if (expectedFileMap.has(filePath)) {
                fsEqual(destinationPath, expectedFileMap.get(filePath));
            }
        }
    }
}
exports.testProcess = testProcess;
//# sourceMappingURL=TestHelpers.spec.js.map