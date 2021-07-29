"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RopmModule = void 0;
const File_1 = require("./File");
const util_1 = require("../util");
const path = require("path");
const packlist = require("npm-packlist");
const rokuDeploy = require("roku-deploy");
const brighterscript_1 = require("brighterscript");
const Logger_1 = require("brighterscript/dist/Logger");
class RopmModule {
    constructor(hostRootDir, 
    /**
     * The directory at the root of the module. This is the folder where the package.json resides
     */
    moduleDir) {
        this.hostRootDir = hostRootDir;
        this.moduleDir = moduleDir;
        this.files = [];
        /**
         * A map from the prefixes used when this module was published, to the prefix that should be used
         * when this module is installed in the overall project.
         * This depends on the module properly referencing every dependency.
         */
        this.prefixMap = {};
        this.isValid = true;
        this.nonPrefixedFunctionMap = {
            'runuserinterface': true,
            'main': true,
            'runscreensaver': true,
            'init': true,
            'onkeyevent': true
        };
        this.npmAliasName = util_1.util.getModuleName(this.moduleDir);
        //compute the ropm name for this alias. This name has all invalid chars removed, and can be used as a brightscript variable/namespace
        this.ropmModuleName = util_1.util.getRopmNameFromModuleName(this.npmAliasName);
    }
    async init() {
        var _a, _b, _c;
        //skip modules we can't derive a name from
        if (!this.npmAliasName) {
            console.error(`ropm: cannot compute npm package name for "${this.moduleDir}"`);
            this.isValid = false;
            return;
        }
        this.packageJson = await util_1.util.getPackageJson(this.moduleDir);
        this.version = this.packageJson.version;
        this.dominantVersion = util_1.util.getDominantVersion(this.packageJson.version);
        if (!this.packageJson.name) {
            console.error(`ropm: missing "name" property from "${path.join(this.moduleDir, 'package.json')}"`);
            this.isValid = false;
            return;
        }
        this.npmModuleName = this.packageJson.name;
        // every ropm module MUST have the `ropm` keyword. If not, then this is not a ropm module
        if (((_a = this.packageJson.keywords) !== null && _a !== void 0 ? _a : []).includes('ropm') === false) {
            console.error(`ropm: skipping prod dependency "${this.moduleDir}" because it does not have the "ropm" keyword`);
            this.isValid = false;
            return;
        }
        //disallow using `noprefix` within dependencies
        if ((_b = this.packageJson.ropm) === null || _b === void 0 ? void 0 : _b.noprefix) {
            console.error(`ropm: using "ropm.noprefix" in a ropm module is forbidden: "${path.join(this.moduleDir, 'package.json')}`);
            this.isValid = false;
            return;
        }
        //use the rootDir from packageJson, or default to the current module path
        this.packageRootDir = ((_c = this.packageJson.ropm) === null || _c === void 0 ? void 0 : _c.packageRootDir) ? path.resolve(this.moduleDir, this.packageJson.ropm.packageRootDir) : this.moduleDir;
    }
    async copyFiles() {
        const packageLogText = `${this.npmAliasName}${this.npmAliasName !== this.npmModuleName ? `(${this.npmModuleName})` : ''}`;
        console.log(`ropm: copying ${packageLogText}@${this.version} as ${this.ropmModuleName}`);
        //use the npm-packlist project to get the list of all files for the entire package...use this as the whitelist
        let allFiles = await packlist({
            path: this.packageRootDir
        });
        //standardize each path
        allFiles = allFiles.map((f) => rokuDeploy.util.standardizePath(f));
        //get the list of all file paths within the rootDir
        let rootDirFiles = await util_1.util.globAll([
            '**/*',
            ...RopmModule.fileIgnorePatterns
        ], {
            cwd: this.packageRootDir,
            //follow symlinks
            follow: true,
            dot: true,
            //skip matching folders (we'll handle file copying ourselves)
            nodir: true
        });
        //standardize each path
        rootDirFiles = rootDirFiles.map((f) => rokuDeploy.util.standardizePath(f));
        const files = rootDirFiles
            //only keep files that are both in the packlist AND the rootDir list
            .filter((rootDirFile) => {
            return allFiles.includes(rootDirFile);
        })
            .filter((rootDirFile) => {
            //filter top-level files (all files should be contained within a subfolder)
            const fileIsLocatedInAFolder = !!/\\|\//.exec(rootDirFile);
            return fileIsLocatedInAFolder;
        });
        //create a map of every source file and where it should be copied to
        this.fileMaps = files.map(filePath => {
            const filePathParts = filePath.split(/\/|\\/);
            const topLevelDir = filePathParts.splice(0, 1)[0];
            const targetPath = path.join(this.hostRootDir, topLevelDir, 'roku_modules', this.ropmModuleName, ...filePathParts);
            return {
                src: path.resolve(this.packageRootDir, filePath),
                dest: targetPath
            };
        });
        //copy the files for this module to their destinations in the host root dir
        await util_1.util.copyFiles(this.fileMaps);
    }
    /**
     * @param noprefix a list of npm aliases of modules that should NOT be prefixed
     */
    async transform(noprefixRopmAliases) {
        const builder = new brighterscript_1.ProgramBuilder();
        //disable the Program.validate function to improve performance (we don't care about the validity of the code...that should be handled by the package publisher)
        util_1.util.mockProgramValidate();
        await builder.run({
            //specify an optional bogus bsconfig which prevents loading any bsconfig found in cwd
            project: '?___not-real-bsconfig.json",',
            copyToStaging: false,
            createPackage: false,
            rootDir: this.packageRootDir,
            cwd: this.packageRootDir,
            //hide all diagnostics, the package author should be responsible for ensuring their package is valid
            diagnosticFilters: ['**/*'],
            //hide log statements
            logLevel: Logger_1.LogLevel.error
        });
        this.program = builder.program;
        //load all files
        for (const obj of this.fileMaps) {
            //only load source code files
            if (['.xml', '.brs', '.bs'].includes(path.extname(obj.dest).toLowerCase())) {
                this.files.push(new File_1.File(obj.src, obj.dest, this.packageRootDir, this.packageJson.ropm));
            }
        }
        //let all files discover all functions/components
        for (const file of this.files) {
            file.discover(this.program);
        }
        //create the edits for every file
        this.createEdits(noprefixRopmAliases);
        //apply all of the edits
        for (const file of this.files) {
            file.applyEdits();
        }
        //write the files back to disk with their changes applied
        await Promise.all(this.files.map((file) => file.write()));
    }
    /**
     * Create the prefix map for this module
     * @param programDependencies - the full list of resolved dependencies from the program. This is created by ModuleManager based on all modules in the program.
     */
    async createPrefixMap(programDependencies) {
        //reassign own module name based on program dependencies
        const ownDependency = programDependencies.find(x => x.npmModuleName === this.npmModuleName && x.dominantVersion === this.dominantVersion);
        if (!ownDependency) {
            throw new Error(`Cannot find ${this.npmModuleName}@${this.dominantVersion} in programDependencies`);
        }
        //rename the ropm module name based on the program dependency. (this could be postfixed with a _v1, _v2, etc. if there is dependency resolution in play)
        this.ropmModuleName = ownDependency.ropmModuleName;
        //compute all of the names of the dependencies within this module, and what prefixes we currently used for them.
        const deps = await util_1.util.getModuleDependencies(this.moduleDir);
        this.prefixMap = {};
        for (const dep of deps) {
            const depDominantVersion = util_1.util.getDominantVersion(dep.version);
            const programDependency = programDependencies.find((x) => x.npmModuleName === dep.npmModuleName && x.dominantVersion === depDominantVersion);
            if (programDependency) {
                this.prefixMap[dep.ropmModuleName] = programDependency.ropmModuleName;
            }
            else {
                const dependencyText = dep.npmAlias === dep.npmModuleName ? dep.npmAlias : `${dep.npmAlias}(${dep.npmModuleName})`;
                throw new Error(`Cannot find suitable program dependency for ${dependencyText}@${dep.version}`);
            }
        }
    }
    getInterfaceFunctions() {
        const names = {};
        for (const file of this.files) {
            for (const func of file.componentInterfaceFunctions) {
                names[func.name.toLowerCase()] = true;
            }
        }
        return names;
    }
    createEdits(noprefixRopmAliases) {
        const applyOwnPrefix = !noprefixRopmAliases.includes(this.ropmModuleName);
        if (!applyOwnPrefix) {
            return;
        }
        const prefix = this.ropmModuleName + '_';
        const brighterscriptPrefix = this.ropmModuleName.replace(/_/g, '.');
        const ownFunctionMap = this.getDistinctFunctionDeclarationMap();
        const ownComponentNames = this.getDistinctComponentDeclarationNames();
        const prefixMapKeys = Object.keys(this.prefixMap);
        const prefixMapKeysLower = prefixMapKeys.map(x => x.toLowerCase());
        /**
         * Get the alias for a namespace. Only returns if it exists and is different than what is given.
         */
        const getAlias = (namespace) => {
            if (namespace) {
                const lowerNamespaceName = namespace.toLowerCase();
                const idx = prefixMapKeysLower.indexOf(lowerNamespaceName);
                const prefix = this.prefixMap[prefixMapKeys[idx]];
                if (prefix && prefix.toLowerCase() !== lowerNamespaceName) {
                    return prefix;
                }
            }
        };
        const nonPrefixedFunctionMap = Object.assign(Object.assign({}, this.nonPrefixedFunctionMap), this.getInterfaceFunctions());
        const ropmPrefixSourceLiteralValue = `"${prefix}"`;
        for (const file of this.files) {
            // replace `m.top.functionName = "<anything>"` assignments to support Tasks
            for (const ref of file.taskFunctionNameAssignments) {
                file.addEdit(ref.offset, ref.offset, prefix);
            }
            //create an edit for each this-module-owned function
            for (const func of file.functionDefinitions) {
                const lowerName = func.name.toLowerCase();
                //skip edits for special functions
                if (nonPrefixedFunctionMap[lowerName]) {
                    continue;
                }
                //handle typedef (.d.bs) files
                if (file.isTypdefFile) {
                    //wrap un-namespaced functions with a namespace
                    if (!func.hasNamespace) {
                        file.addEdit(func.startOffset, func.startOffset, `namespace ${brighterscriptPrefix}\n`);
                        file.addEdit(func.endOffset, func.endOffset, `\nend namespace`);
                    }
                    continue;
                    //functions with leading underscores are treated specially
                }
                else if (func.name.startsWith('_')) {
                    const leadingUnderscores = /^_+/.exec(func.name)[0];
                    file.addEdit(func.nameOffset + leadingUnderscores.length, func.nameOffset + leadingUnderscores.length, `${this.ropmModuleName}_`);
                }
                else {
                    //is NOT a typedef file, and is not a nonPrefixed function, so prefix it
                    file.addEdit(func.nameOffset, func.nameOffset, prefix);
                }
            }
            //wrap un-namespaced classes with prefix namespace
            for (const cls of file.classDeclarations) {
                if (!cls.hasNamespace) {
                    file.addEdit(cls.startOffset, cls.startOffset, `namespace ${brighterscriptPrefix}\n`);
                    file.addEdit(cls.endOffset, cls.endOffset, `\nend namespace`);
                }
            }
            //prefix d.bs class references
            for (const ref of file.classReferences) {
                const baseNamespace = util_1.util.getBaseNamespace(ref.fullyQualifiedName);
                const alias = getAlias(baseNamespace);
                let fullyQualifiedName;
                //if we have an alias, this is a class from another module.
                if (alias) {
                    fullyQualifiedName = ref.fullyQualifiedName.replace(/^.*?\./, alias + '.');
                }
                else {
                    //this is an internal-module class, so append our prefix to it
                    fullyQualifiedName = `${brighterscriptPrefix}.${ref.fullyQualifiedName}`;
                }
                file.addEdit(ref.offsetBegin, ref.offsetEnd, fullyQualifiedName);
            }
            //prefix d.bs namespaces
            for (const namespace of file.namespaces) {
                file.addEdit(namespace.offset, namespace.offset, brighterscriptPrefix + '.');
            }
            //prefix all function calls to our own function names
            for (const call of file.functionReferences) {
                const lowerName = call.name.toLowerCase();
                //skip edits for special functions
                if (nonPrefixedFunctionMap[lowerName]) {
                    continue;
                }
                //if this function is owned by our project, rename it
                if (ownFunctionMap[lowerName]) {
                    if (lowerName.startsWith('_')) {
                        const leadingUnderscores = /^_+/.exec(lowerName)[0];
                        file.addEdit(call.offset + leadingUnderscores.length, call.offset + leadingUnderscores.length, `${this.ropmModuleName}_`);
                    }
                    else {
                        file.addEdit(call.offset, call.offset, prefix);
                    }
                    continue;
                }
                //rename dependency function calls
                const possiblePrefix = lowerName.split('_')[0];
                const idx = prefixMapKeysLower.indexOf(possiblePrefix);
                //if we have a prefix match, then convert the old prefix to the new prefix
                if (idx > -1) {
                    const newPrefix = this.prefixMap[prefixMapKeys[idx]];
                    //begin position + the length of the original prefix + 1 for the underscore
                    const offsetEnd = call.offset + possiblePrefix.length + 1;
                    file.addEdit(call.offset, offsetEnd, newPrefix + '_');
                }
            }
            //replace ROPM_PREFIX source literals and prefix identifiers with same name as function
            for (const identifier of file.identifiers) {
                const lowerName = identifier.name.toLowerCase();
                //replace ROPM_PREFIX source literal
                if (lowerName === 'ropm_prefix') {
                    file.addEdit(identifier.offset, identifier.offset + identifier.name.length, ropmPrefixSourceLiteralValue);
                }
                //skip edits for special functions
                if (nonPrefixedFunctionMap[lowerName]) {
                    continue;
                }
                //if this identifier has the same name as a function, then prefix the identifier
                if (ownFunctionMap[lowerName]) {
                    file.addEdit(identifier.offset, identifier.offset, prefix);
                }
            }
            //rename all this-file-defined component definitions
            for (const comp of file.componentDeclarations) {
                file.addEdit(comp.offset, comp.offset, prefix);
            }
            //rename all component usage
            for (const comp of file.componentReferences) {
                //if this component is owned by our module, rename it
                if (ownComponentNames.includes(comp.name.toLowerCase())) {
                    file.addEdit(comp.offset, comp.offset, prefix);
                    //rename dependency component usage
                }
                else {
                    const possiblePrefix = comp.name.toLowerCase().split('_')[0];
                    const idx = prefixMapKeysLower.indexOf(possiblePrefix);
                    //if we have a prefix match, then convert the old prefix to the new prefix
                    if (idx > -1) {
                        const newPrefix = this.prefixMap[prefixMapKeys[idx]];
                        //begin position + the length of the original prefix + 1 for the underscore
                        const offsetEnd = comp.offset + possiblePrefix.length + 1;
                        file.addEdit(comp.offset, offsetEnd, newPrefix + '_');
                    }
                }
            }
            //rewrite file references
            for (const fileReference of file.fileReferences) {
                this.createFileReferenceEdit(file, fileReference);
            }
        }
    }
    createFileReferenceEdit(file, fileReference) {
        let pkgPathAbsolute;
        if (fileReference.path.startsWith('pkg:')) {
            pkgPathAbsolute = fileReference.path;
            //relative path. resolve to absolute path
        }
        else {
            pkgPathAbsolute = `pkg:/` + path.posix.normalize(path.dirname(file.pkgPath) + '/' + fileReference.path);
        }
        const parts = pkgPathAbsolute.split('/');
        //discard the first part (pkg:)
        parts.splice(0, 1);
        const baseFolder = parts[0];
        //remove the base folder part
        parts.splice(0, 1);
        let newPath;
        //if the second folder is `roku_modules`
        if (parts[0] === 'roku_modules') {
            //remove the roku_modules bit
            parts.splice(0, 1);
            //this is a reference to a dependency's file
            const dependencyName = parts[0];
            //remove the dependency name bit
            parts.splice(0, 1);
            const newDependencyName = this.prefixMap[dependencyName.toLowerCase()];
            newPath = `pkg:/${baseFolder}/roku_modules/${newDependencyName}/${parts.join('/')}`;
        }
        else {
            //this is a reference to this module's own file
            newPath = `pkg:/${baseFolder}/roku_modules/${this.ropmModuleName}/${parts.join('/')}`;
        }
        file.addEdit(fileReference.offset, fileReference.offset + fileReference.path.length, newPath);
    }
    /**
     * Scan every file and compute the list of function declaration names.
     */
    getDistinctFunctionDeclarationMap() {
        const result = {};
        for (const file of this.files) {
            for (const func of file.functionDefinitions) {
                //skip the special function names
                if (this.nonPrefixedFunctionMap[func.name.toLowerCase()]) {
                    continue;
                }
                result[func.name.toLowerCase()] = true;
            }
        }
        return result;
    }
    /**
     * Get the distinct names of function calls
     */
    getDistinctFunctionCallNames() {
        const result = {};
        for (const file of this.files) {
            for (const call of file.functionReferences) {
                result[call.name.toLowerCase()] = true;
            }
        }
        return Object.keys(result);
    }
    /**
     * Get the distinct names of component declarations
     */
    getDistinctComponentDeclarationNames() {
        const result = {};
        for (const file of this.files) {
            for (const comp of file.componentDeclarations) {
                result[comp.name.toLowerCase()] = true;
            }
        }
        return Object.keys(result);
    }
    /**
     * Get the distinct names of components used
     */
    getDistinctComponentReferenceNames() {
        const result = {};
        for (const file of this.files) {
            for (const comp of file.componentReferences) {
                result[comp.name.toLowerCase()] = true;
            }
        }
        return Object.keys(result);
    }
}
exports.RopmModule = RopmModule;
/**
 * A list of globs that will always be ignored during copy from node_modules to roku_modules
 */
RopmModule.fileIgnorePatterns = [
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
    '!**/package-lock.json',
    //package authors should exclude `roku_modules` during publishing, but things might slip through the cracks, so exclude those during ropm install
    '!**/roku_modules/**/*'
];
//# sourceMappingURL=RopmModule.js.map