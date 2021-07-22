import type { RopmOptions } from '../util';
import type { BrsFile, Program, XmlFile } from 'brighterscript';
export declare class File {
    /**
     * The path to the file's original location
     */
    srcPath: string;
    /**
     * The path to the file's new location
     */
    destPath: string;
    /**
     * The absolute path to the rootDir for this file
     */
    rootDir: string;
    options: RopmOptions;
    constructor(
    /**
     * The path to the file's original location
     */
    srcPath: string, 
    /**
     * The path to the file's new location
     */
    destPath: string, 
    /**
     * The absolute path to the rootDir for this file
     */
    rootDir: string, options?: RopmOptions);
    /**
     * Is this file a `.brs` file?
     */
    get isBrsFile(): boolean;
    /**
     * Is this a .bs file? (NOT a .d.bs file)
     */
    get isBsFile(): boolean;
    /**
     * Is this a .d.bs file?
     */
    get isTypdefFile(): boolean;
    /**
     * Is this a .xml file
     */
    get isXmlFile(): boolean;
    /**
     * The full pkg path to the file (minus the `pkg:/` protocol since we never actually need that part)
     */
    pkgPath: string;
    functionDefinitions: {
        name: string;
        nameOffset: number;
        hasNamespace: boolean;
        /**
         * The starting offset of `function` or `sub`
         */
        startOffset: number;
        /**
         * The end offset of `end function` or `end sub`
         */
        endOffset: number;
    }[];
    classDeclarations: {
        name: string;
        nameOffset: number;
        hasNamespace: boolean;
        /**
         * The starting offset of `class`
         */
        startOffset: number;
        /**
         * The end offset of `end class`
         */
        endOffset: number;
    }[];
    /**
     * Anywhere that a class is used as a type (like in class `extends` or function parameters)
     */
    classReferences: {
        fullyQualifiedName: string;
        offsetBegin: number;
        offsetEnd: number;
    }[];
    functionReferences: {
        name: string;
        offset: number;
    }[];
    /**
     * Every instance of `m.top.functionName = "<anything>".
     * Used only if this file is referenced by a Task
     */
    taskFunctionNameAssignments: {
        name: string;
        offset: number;
    }[];
    /**
     * A list of locations in this file that DECLARE a component (i.e. <component name="<component_name"
     */
    componentDeclarations: {
        name: string;
        offset: number;
    }[];
    /**
     * A list of locations in this file that USE component names (in brs functions as well as xml)
     */
    componentReferences: {
        name: string;
        offset: number;
    }[];
    /**
     * List of functions referenced by a component's <interface> element
     */
    componentInterfaceFunctions: {
        name: string;
        offset: number;
    }[];
    /**
     * A list of file paths found in this file.
     * The offset points to the first character of the path itself (i.e. NOT the quotemark when found
     */
    fileReferences: {
        path: string;
        offset: number;
    }[];
    /**
     * Identifiers found in this file. We use this list to replace known function names, so it's ok to be a little greedy in our matching.
     */
    identifiers: {
        name: string;
        offset: number;
    }[];
    /**
     * Namespaces found in this file (only applies to typedefs)
     */
    namespaces: {
        name: string;
        offset: number;
    }[];
    private edits;
    /**
     * A concrete syntax tree for any parsed xml
     */
    private xmlAst;
    private loadFile;
    private lineOffsetMap;
    /**
     * Convert a position into an offset from the start of the file
     */
    private positionToOffset;
    bscFile: BrsFile | XmlFile;
    /**
     * Scan the file for all important information
     */
    discover(program: Program): void;
    private addClassRef;
    /**
     * find various items from this file.
     */
    walkAst(): void;
    /**
     * Add a new edit that should be applied to the file at a later time
     */
    addEdit(offsetBegin: number, offsetEnd: number, newText: string): void;
    /**
     * apply all of the current edits
     */
    applyEdits(): void;
    /**
     * Write the new file contents back to disk
     */
    write(): Promise<void>;
    /**
     * Find all occurances of *.observeField and *.observeFieldScoped function calls that have a string literal as the second parameter
     */
    private findObserveFieldFunctionCalls;
    private findComponentDefinitions;
    /**
     * Find component names from the `extends` attribute of the `<component` element
     */
    private findExtendsComponentReferences;
    /**
     * Find all function names referenced by a component's <interface> element
     */
    private findComponentInterfaceFunctions;
    private findComponentFieldOnChangeFunctions;
    /**
     * Find component names from `CreateObject("RoSGNode", "<component_name>")` function calls
     */
    private findCreateObjectComponentReferences;
    /**
     * Find all calls to `.CreateChild("COMPONENT_NAME")`.
     * There is a slight chance this could catch some false positives for modules that have their own CreateChild(string) method,
     * but it's unlikely to matter since we would only replace these calls that actually contain known component names
     */
    private findCreateChildComponentReferences;
    /**
     * Find all components used as XML elements
     */
    private findXmlChildrenComponentReferences;
    /**
     * Look for every string containing a 'pkg:/' path
     */
    private findFilePathStrings;
    /**
     * Look for every `<script` element in XML files and extract their file paths
     */
    private findFilePathsFromXmlScriptElements;
    /**
     * Look for every statement that looks exactly like the default task functionName assignment.
     */
    private findTaskFunctionNameAssignments;
}
export interface Edit {
    offsetBegin: number;
    offsetEnd: number;
    newText: string;
}
