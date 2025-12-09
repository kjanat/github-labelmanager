//#region src/main.d.ts
/** Function type for reading file contents */
type ReadFileFn = (path: string, encoding: BufferEncoding) => string;
/**
 * The main function for the action.
 *
 * @param readFile - Function to read file contents (injectable for testing)
 * @returns Resolves when the action is complete.
 */
declare function run(readFile?: ReadFileFn): Promise<void>;
//#endregion
export { run };
//# sourceMappingURL=index.d.mts.map