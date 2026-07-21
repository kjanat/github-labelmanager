/**
 * @actions/exec mock for bun:test
 */
import type { getExecOutput as getExecOutputFn } from "@actions/exec";
import { mock } from "bun:test";

export const getExecOutput = mock<typeof getExecOutputFn>();

/** Clear exec mocks */
export function clearExecMocks(): void {
  getExecOutput.mockClear();
}
