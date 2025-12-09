import { endGroup, setFailed, setOutput, startGroup } from "@actions/core";
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
    setOutput("git-diff", stdout.trim());
    return { exitCode, diff: stdout.trim(), error: stderr };
  } catch (error) {
    setFailed(`Failed to get git diff: ${error}`);
    return { exitCode: 128, diff: "", error: String(error) };
  } finally {
    endGroup();
  }
}
