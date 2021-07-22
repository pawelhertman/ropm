"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
/* eslint-disable no-cond-assign */
const fsExtra = require("fs-extra");
const xmlParser = require("@xml-tools/parser");
const ast_1 = require("@xml-tools/ast");
const util_1 = require("../util");
const path = require("path");
const brighterscript_1 = require("brighterscript");
class File {
    constructor(
    /**
     * The path to the file's original location
     */
    srcPath, 
    /**
     * The path to the file's new location
     */
    destPath, 
    /**
     * The absolute path to the rootDir for this file
     */
    rootDir, options = {}) {
        this.srcPath = srcPath;
        this.destPath = destPath;
        this.rootDir = rootDir;
        this.options = options;
        this.functionDefinitions = [];
        this.classDeclarations = [];
        /**
         * Anywhere that a class is used as a type (like in class `extends` or function parameters)
         */
        this.classReferences = [];
        this.functionReferences = [];
        /**
         * Every instance of `m.top.functionName = "<anything>".
         * Used only if this file is referenced by a Task
         */
        this.taskFunctionNameAssignments = [];
        /**
         * A list of locations in this file that DECLARE a component (i.e. <component name="<component_name"
         */
        this.componentDeclarations = [];
        /**
         * A list of locations in this file that USE component names (in brs functions as well as xml)
         */
        this.componentReferences = [];
        /**
         * List of functions referenced by a component's <interface> element
         */
        this.componentInterfaceFunctions = [];
        /**
         * A list of file paths found in this file.
         * The offset points to the first character of the path itself (i.e. NOT the quotemark when found
         */
        this.fileReferences = [];
        /**
         * Identifiers found in this file. We use this list to replace known function names, so it's ok to be a little greedy in our matching.
         */
        this.identifiers = [];
        /**
         * Namespaces found in this file (only applies to typedefs)
         */
        this.namespaces = [];
        this.edits = [];
        this.pkgPath = path.posix.normalize(util_1.util.removeLeadingSlash(util_1.util.replaceCaseInsensitive(rootDir, srcPath, '').replace(/\\/g, '/')));
    }
    /**
     * Is this file a `.brs` file?
     */
    get isBrsFile() {
        return this.srcPath.toLowerCase().endsWith('.brs');
    }
    /**
     * Is this a .bs file? (NOT a .d.bs file)
     */
    get isBsFile() {
        const lowerSrcPath = this.srcPath.toLowerCase();
        return lowerSrcPath.endsWith('.bs') && !lowerSrcPath.endsWith('.d.bs');
    }
    /**
     * Is this a .d.bs file?
     */
    get isTypdefFile() {
        return this.srcPath.toLowerCase().endsWith('.d.bs');
    }
    /**
     * Is this a .xml file
     */
    get isXmlFile() {
        return this.srcPath.toLowerCase().endsWith('.xml');
    }
    loadFile() {
        var _a, _b;
        if (!this.xmlAst && this.destPath.toLowerCase().endsWith('.xml')) {
            const { cst, lexErrors, parseErrors, tokenVector } = xmlParser.parse(this.bscFile.fileContents);
            //print every lex and parse error to the console
            for (const lexError of lexErrors) {
                console.error(`XML parse error "${lexError.message}" at ${this.destPath}:${lexError.line}:${lexError.column}`);
            }
            for (const parseError of parseErrors) {
                console.error(`XML parse error "${parseError.message}" at ${this.destPath}:${(_a = parseError.token[0]) === null || _a === void 0 ? void 0 : _a.startLine}:${(_b = parseError.token[0]) === null || _b === void 0 ? void 0 : _b.startColumn}`);
            }
            this.xmlAst = ast_1.buildAst(cst, tokenVector);
        }
    }
    /**
     * Convert a position into an offset from the start of the file
     */
    positionToOffset(position) {
        //create the line/offset map if not yet created
        if (!this.lineOffsetMap) {
            this.lineOffsetMap = {};
            this.lineOffsetMap[0] = 0;
            const regexp = /(\r?\n)/g;
            let lineIndex = 1;
            let match;
            while (match = regexp.exec(this.bscFile.fileContents)) {
                this.lineOffsetMap[lineIndex++] = match.index + match[1].length;
            }
        }
        return this.lineOffsetMap[position.line] + position.character;
    }
    /**
     * Scan the file for all important information
     */
    discover(program) {
        this.bscFile = program.getFileByPathAbsolute(this.srcPath);
        this.loadFile();
        this.functionDefinitions = [];
        this.functionReferences = [];
        this.componentDeclarations = [];
        this.componentReferences = [];
        this.fileReferences = [];
        if (this.isBrsFile || this.isBsFile || this.isTypdefFile) {
            this.findFilePathStrings();
            this.findCreateObjectComponentReferences();
            this.findCreateChildComponentReferences();
            this.findObserveFieldFunctionCalls();
            this.findTaskFunctionNameAssignments();
            this.walkAst();
        }
        else if (this.isXmlFile) {
            this.findFilePathStrings();
            this.findXmlChildrenComponentReferences();
            this.findFilePathsFromXmlScriptElements();
            this.findComponentDefinitions();
            this.findExtendsComponentReferences();
            this.findComponentInterfaceFunctions();
            this.findComponentFieldOnChangeFunctions();
        }
    }
    addClassRef(className, containingNamespace, range) {
        var _a, _b;
        //look up the class. If we can find it, use it
        const cls = (_a = this.bscFile.getClassFileLink(className, containingNamespace)) === null || _a === void 0 ? void 0 : _a.item;
        let fullyQualifiedName;
        if (cls) {
            fullyQualifiedName = brighterscript_1.util.getFullyQualifiedClassName(cls.getName(brighterscript_1.ParseMode.BrighterScript), (_b = cls.namespaceName) === null || _b === void 0 ? void 0 : _b.getName(brighterscript_1.ParseMode.BrighterScript));
        }
        else {
            fullyQualifiedName = brighterscript_1.util.getFullyQualifiedClassName(className, containingNamespace);
        }
        this.classReferences.push({
            fullyQualifiedName: fullyQualifiedName,
            offsetBegin: this.positionToOffset(range.start),
            offsetEnd: this.positionToOffset(range.end)
        });
    }
    /**
     * find various items from this file.
     */
    walkAst() {
        const file = this.bscFile;
        /* eslint-disable @typescript-eslint/naming-convention */
        file.parser.ast.walk(brighterscript_1.createVisitor({
            ImportStatement: (stmt) => {
                //skip pkg paths, those are collected elsewhere
                if (!stmt.filePath.startsWith('pkg:/')) {
                    this.fileReferences.push({
                        offset: this.positionToOffset(stmt.filePathToken.range.start),
                        path: stmt.filePath
                    });
                }
            },
            VariableExpression: (variable, parent) => {
                //skip objects to left of dotted/indexed expressions
                if ((brighterscript_1.isDottedSetStatement(parent) ||
                    brighterscript_1.isDottedGetExpression(parent) ||
                    brighterscript_1.isIndexedSetStatement(parent) ||
                    brighterscript_1.isIndexedGetExpression(parent)) && parent.obj === variable) {
                    return;
                }
                //track function calls
                if (brighterscript_1.isCallExpression(parent) && variable === parent.callee) {
                    this.functionReferences.push({
                        name: variable.name.text,
                        offset: this.positionToOffset(variable.name.range.start)
                    });
                }
                else {
                    //track identifiers
                    this.identifiers.push({
                        name: variable.name.text,
                        offset: this.positionToOffset(variable.name.range.start)
                    });
                }
            },
            //track class declarations (.bs and .d.bs only)
            ClassStatement: (cls) => {
                var _a, _b;
                this.classDeclarations.push({
                    name: cls.name.text,
                    nameOffset: this.positionToOffset(cls.name.range.start),
                    hasNamespace: !!cls.namespaceName,
                    //Use annotation start position if available, otherwise use class keyword
                    startOffset: this.positionToOffset((((_a = cls.annotations) === null || _a === void 0 ? void 0 : _a.length) > 0 ? cls.annotations[0] : cls.classKeyword).range.start),
                    endOffset: this.positionToOffset(cls.end.range.end)
                });
                if (cls.parentClassName) {
                    this.addClassRef(cls.parentClassName.getName(brighterscript_1.ParseMode.BrighterScript), (_b = cls.namespaceName) === null || _b === void 0 ? void 0 : _b.getName(brighterscript_1.ParseMode.BrighterScript), cls.parentClassName.range);
                }
            },
            FunctionExpression: (func) => {
                var _a;
                const namespaceName = (_a = func.namespaceName) === null || _a === void 0 ? void 0 : _a.getName(brighterscript_1.ParseMode.BrighterScript);
                //any parameters containing custom types
                for (const param of func.parameters) {
                    if (brighterscript_1.isCustomType(param.type)) {
                        this.addClassRef(param.type.name, namespaceName, param.typeToken.range);
                    }
                }
                if (brighterscript_1.isCustomType(func.returnType)) {
                    this.addClassRef(func.returnType.name, namespaceName, func.returnTypeToken.range);
                }
            },
            FunctionStatement: (func) => {
                var _a;
                this.functionDefinitions.push({
                    name: func.name.text,
                    nameOffset: this.positionToOffset(func.name.range.start),
                    hasNamespace: !!func.namespaceName,
                    //Use annotation start position if available, otherwise use keyword
                    startOffset: this.positionToOffset((((_a = func.annotations) === null || _a === void 0 ? void 0 : _a.length) > 0 ? func.annotations[0] : func.func.functionType).range.start),
                    endOffset: this.positionToOffset(func.func.end.range.end)
                });
            },
            NamespaceStatement: (namespace) => {
                this.namespaces.push({
                    name: namespace.name,
                    offset: this.positionToOffset(namespace.nameExpression.range.start)
                });
            }
        }), {
            walkMode: brighterscript_1.WalkMode.visitAllRecursive
        });
        /* eslint-enable @typescript-eslint/naming-convention */
    }
    /**
     * Add a new edit that should be applied to the file at a later time
     */
    addEdit(offsetBegin, offsetEnd, newText) {
        this.edits.push({
            offsetBegin: offsetBegin,
            offsetEnd: offsetEnd,
            newText: newText
        });
    }
    /**
     * apply all of the current edits
     */
    applyEdits() {
        //noting to do if there are no edits
        if (this.edits.length === 0) {
            return;
        }
        //sort the edits in DESCENDING order of offset, so we can simply walk backwards in the file and apply all edits
        const edits = this.edits.sort((e1, e2) => {
            if (e1.offsetBegin > e2.offsetBegin) {
                return -1;
            }
            else if (e1.offsetBegin < e2.offsetBegin) {
                return 1;
            }
            else {
                return 0;
            }
        });
        let contents = this.bscFile.fileContents;
        const chunks = [];
        for (const edit of edits) {
            //store the traling part of the string
            chunks.push(contents.substring(edit.offsetEnd));
            //store the edit text
            chunks.push(edit.newText);
            //remove everything after the start of the edit
            contents = contents.substring(0, edit.offsetBegin);
        }
        chunks.push(contents);
        this.bscFile.fileContents = chunks.reverse().join('');
    }
    /**
     * Write the new file contents back to disk
     */
    async write() {
        await fsExtra.writeFile(this.destPath, this.bscFile.fileContents);
    }
    /**
     * Find all occurances of *.observeField and *.observeFieldScoped function calls that have a string literal as the second parameter
     */
    findObserveFieldFunctionCalls() {
        //capture function names as a string literal in `observeField` and `observeFieldScoped` functions.
        const regexp = /(\.observeField(?:Scoped)?[ \t]*\(.*?,[ \t]*")([a-z0-9_]+)"\)[ \t]*(?:'.*)*$/gim;
        let match;
        while (match = regexp.exec(this.bscFile.fileContents)) {
            //skip multi-line observeField calls (because they are way too hard to parse with regex :D )
            if (util_1.util.hasMatchingParenCount(match[0]) === false) {
                continue;
            }
            //just add this to function calls, since there's no difference in terms of how they get replaced
            this.functionReferences.push({
                name: match[2],
                offset: match.index + match[1].length
            });
        }
    }
    findComponentDefinitions() {
        var _a, _b, _c, _d;
        const nameAttribute = (_c = (_b = (_a = this.xmlAst) === null || _a === void 0 ? void 0 : _a.rootElement) === null || _b === void 0 ? void 0 : _b.attributes) === null || _c === void 0 ? void 0 : _c.find(x => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'name'; });
        if ((nameAttribute === null || nameAttribute === void 0 ? void 0 : nameAttribute.value) && ((_d = nameAttribute === null || nameAttribute === void 0 ? void 0 : nameAttribute.syntax) === null || _d === void 0 ? void 0 : _d.value)) {
            this.componentDeclarations.push({
                name: nameAttribute.value,
                //plus one to step past the opening "
                offset: nameAttribute.syntax.value.startOffset + 1
            });
        }
    }
    /**
     * Find component names from the `extends` attribute of the `<component` element
     */
    findExtendsComponentReferences() {
        var _a, _b, _c, _d;
        //get any "extends" attribute from the xml
        const extendsAttribute = (_c = (_b = (_a = this.xmlAst) === null || _a === void 0 ? void 0 : _a.rootElement) === null || _b === void 0 ? void 0 : _b.attributes) === null || _c === void 0 ? void 0 : _c.find(x => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'extends'; });
        if ((extendsAttribute === null || extendsAttribute === void 0 ? void 0 : extendsAttribute.value) && ((_d = extendsAttribute === null || extendsAttribute === void 0 ? void 0 : extendsAttribute.syntax) === null || _d === void 0 ? void 0 : _d.value)) {
            this.componentReferences.push({
                name: extendsAttribute.value,
                //plus one to step past the opening "
                offset: extendsAttribute.syntax.value.startOffset + 1
            });
        }
    }
    /**
     * Find all function names referenced by a component's <interface> element
     */
    findComponentInterfaceFunctions() {
        var _a, _b, _c, _d, _e;
        const interfaceEntries = (_d = (_c = (_b = (_a = this.xmlAst) === null || _a === void 0 ? void 0 : _a.rootElement) === null || _b === void 0 ? void 0 : _b.subElements.find(x => { var _a; return ((_a = x.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'interface'; })) === null || _c === void 0 ? void 0 : _c.subElements) !== null && _d !== void 0 ? _d : [];
        for (const interfaceEntry of interfaceEntries) {
            const nameAttribute = interfaceEntry.attributes.find(x => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'name'; });
            if (((_e = interfaceEntry.name) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === 'function' && nameAttribute) {
                this.componentInterfaceFunctions.push({
                    name: nameAttribute.value,
                    //plus one to step past the opening "
                    offset: nameAttribute.syntax.value.startOffset + 1
                });
            }
        }
    }
    findComponentFieldOnChangeFunctions() {
        var _a, _b, _c, _d, _e;
        const interfaceEntries = (_d = (_c = (_b = (_a = this.xmlAst) === null || _a === void 0 ? void 0 : _a.rootElement) === null || _b === void 0 ? void 0 : _b.subElements.find(x => { var _a; return ((_a = x.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'interface'; })) === null || _c === void 0 ? void 0 : _c.subElements) !== null && _d !== void 0 ? _d : [];
        for (const interfaceEntry of interfaceEntries) {
            const nameAttribute = interfaceEntry.attributes.find(x => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'name'; });
            if (((_e = interfaceEntry.name) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === 'field' && nameAttribute) {
                const onchange = interfaceEntry.attributes.find(x => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'onchange'; });
                if (onchange) {
                    this.functionReferences.push({
                        name: onchange.value,
                        //plus one to step past the opening "
                        offset: onchange.syntax.value.startOffset + 1
                    });
                }
            }
        }
    }
    /**
     * Find component names from `CreateObject("RoSGNode", "<component_name>")` function calls
     */
    findCreateObjectComponentReferences() {
        const regexp = /(createobject\s*\(\s*"rosgnode"\s*,\s*")(.+)"\s*\)/gi;
        let match;
        //look through each line of the file
        while (match = regexp.exec(this.bscFile.fileContents)) {
            const componentName = match[2];
            const startOffset = match.index + match[1].length;
            this.componentReferences.push({
                name: componentName,
                offset: startOffset
            });
        }
    }
    /**
     * Find all calls to `.CreateChild("COMPONENT_NAME")`.
     * There is a slight chance this could catch some false positives for modules that have their own CreateChild(string) method,
     * but it's unlikely to matter since we would only replace these calls that actually contain known component names
     */
    findCreateChildComponentReferences() {
        const regexp = /(\.\s*CreateChild\s*\((?:\r?\n|\s)*")(.*)"/gi;
        let match;
        //look through each line of the file
        while (match = regexp.exec(this.bscFile.fileContents)) {
            const componentName = match[2];
            const startOffset = match.index + match[1].length;
            this.componentReferences.push({
                name: componentName,
                offset: startOffset
            });
        }
    }
    /**
     * Find all components used as XML elements
     */
    findXmlChildrenComponentReferences() {
        //all components must be added as chlidren of the `<children>` element in a `<component>`
        var _a, _b, _c, _d, _e;
        const childrenElement = (_c = (_b = (_a = this.xmlAst) === null || _a === void 0 ? void 0 : _a.rootElement) === null || _b === void 0 ? void 0 : _b.subElements) === null || _c === void 0 ? void 0 : _c.find(x => { var _a; return ((_a = x.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'children'; });
        const children = [];
        if (childrenElement) {
            children.push(...childrenElement.subElements);
        }
        while (children.length > 0) {
            const child = children.pop();
            if ((_d = child === null || child === void 0 ? void 0 : child.syntax) === null || _d === void 0 ? void 0 : _d.openName) {
                children.push(...(_e = child === null || child === void 0 ? void 0 : child.subElements) !== null && _e !== void 0 ? _e : []);
                const offsetBegin = child.syntax.openName.startOffset;
                //save the opening tag
                this.componentReferences.push({
                    name: child === null || child === void 0 ? void 0 : child.name,
                    offset: offsetBegin
                });
            }
            //if there's a closing tag, save that
            if (child === null || child === void 0 ? void 0 : child.syntax.closeName) {
                const offsetBegin = child.syntax.closeName.startOffset;
                this.componentReferences.push({
                    name: child.syntax.closeName.image,
                    offset: offsetBegin
                });
            }
        }
    }
    /**
     * Look for every string containing a 'pkg:/' path
     */
    findFilePathStrings() {
        //look for any string containing `pkg:/`
        const regexp = /"(pkg:\/[^"]+)"/gi;
        let match;
        while (match = regexp.exec(this.bscFile.fileContents)) {
            this.fileReferences.push({
                //+1 to step past opening quote
                offset: match.index + 1,
                path: match[1]
            });
        }
    }
    /**
     * Look for every `<script` element in XML files and extract their file paths
     */
    findFilePathsFromXmlScriptElements() {
        var _a, _b, _c, _d;
        //skip non-xml files
        if (!this.xmlAst) {
            return;
        }
        //script elements must be direct-children of the `<component` element
        const elements = (_b = (_a = this.xmlAst.rootElement) === null || _a === void 0 ? void 0 : _a.subElements) !== null && _b !== void 0 ? _b : [];
        for (const element of elements) {
            //if this is a script element
            if (((_c = element.name) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === 'script') {
                const uriAttribute = element.attributes.find((x) => { var _a; return ((_a = x.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'uri'; });
                //if we have a `uri` attribute
                if ((uriAttribute === null || uriAttribute === void 0 ? void 0 : uriAttribute.value) && ((_d = uriAttribute === null || uriAttribute === void 0 ? void 0 : uriAttribute.syntax) === null || _d === void 0 ? void 0 : _d.value)) {
                    //+1 to step past the opening double-quote
                    const offset = uriAttribute.syntax.value.startOffset + 1;
                    //add this reference only if we don't already have it (the previous regex can sometimes match these)
                    if (!this.fileReferences.find(x => x.offset === offset)) {
                        this.fileReferences.push({
                            path: uriAttribute.value,
                            offset: offset
                        });
                    }
                }
            }
        }
    }
    /**
     * Look for every statement that looks exactly like the default task functionName assignment.
     */
    findTaskFunctionNameAssignments() {
        //look for any string containing `m.top.functionName = "<anything>"`
        const regexp = /(m\s*\.\s*top\s*\.\s*functionName\s*=\s*")(.*?)"/gi;
        let match;
        while (match = regexp.exec(this.bscFile.fileContents)) {
            this.taskFunctionNameAssignments.push({
                offset: match.index + match[1].length,
                name: match[2]
            });
        }
    }
}
exports.File = File;
//# sourceMappingURL=File.js.map