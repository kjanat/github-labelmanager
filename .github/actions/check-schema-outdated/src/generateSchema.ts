import { endGroup, setFailed, startGroup } from "@actions/core";
import { getExecOutput } from "@actions/exec";

export async function generateSchema(): Promise<number> {
  startGroup("Generate schema");
  try {
    const { exitCode } = await getExecOutput("deno", ["task", "schema"], {
      ignoreReturnCode: true,
    });
    return exitCode;
  } catch (error) {
    setFailed(`Failed to generate schema: ${error}`);
    return 1;
  } finally {
    endGroup();
  }
}
