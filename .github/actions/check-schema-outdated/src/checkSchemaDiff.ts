import { endGroup, setOutput, startGroup } from "@actions/core";
import { getExecOutput } from "@actions/exec";

export async function checkSchemaDiff(
  file: string,
): Promise<{ exitCode: number; diff: string; error: string }> {
  startGroup("Check schema diff");
  try {
    const { exitCode, stdout, stderr } = await getExecOutput(
      "git",
      ["diff", "--exit-code", "--color=never", file],
      { ignoreReturnCode: true },
    );
    const diff = stdout.trim();
    const error = stderr.trim();
    setOutput("git-diff", diff);
    return { exitCode, diff, error };
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    // Let run() handle the failure via exitCode > 1 check
    return { exitCode: 128, diff: "", error: message };
  } finally {
    endGroup();
  }
}
