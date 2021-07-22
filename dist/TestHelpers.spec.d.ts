/// <reference types="sinon" />
import { RopmModule } from './prefixer/RopmModule';
import type { RopmOptions } from './util';
export declare const sinon: import("sinon").SinonSandbox;
export declare const tempDir: string;
export declare function file(filePath: string, contents: string): void;
export declare function mergePackageJson(dir: string, data: any): void;
export declare function fsEqual(path: string, expectedText: string): void;
export declare function trim(strings: TemplateStringsArray, ...args: any[]): string;
/**
 * Helper function to scaffold a project with nested dependencies
 */
export declare function createProjects(hostDir: string, moduleDir: string, node: DepGraphNode): RopmModule[];
export interface DepGraphNode {
    alias?: string;
    name: string;
    version?: string;
    dependencies?: Array<DepGraphNode>;
    _files?: Record<string, string>;
    ropm?: RopmOptions;
}
export declare function expectThrowsAsync(func: any, startingText?: string): Promise<void>;
/**
 * A tagged template literal function for standardizing the path.
 */
export declare function standardizePath(stringParts: any, ...expressions: any[]): string;
export declare function pick(objects: any[], ...properties: string[]): any[];
/**
 * Streamlined way to test the ModuleManager.process functionality
 * The key is in the format `moduleName:path/to/file.ext`. You can specify an alias by doing `alias@moduleName:path/to/file.ext`
 */
export declare function testProcess(args: Record<string, [source: string, expected?: string]>): Promise<void>;
