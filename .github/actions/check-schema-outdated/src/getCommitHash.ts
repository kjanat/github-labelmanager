import { endGroup, setFailed, setOutput, startGroup } from "@actions/core";
import { getExecOutput } from "@actions/exec";

export async function getCommitHash(): Promise<string> {
  startGroup("Get commit hash");
  try {
    const { stdout } = await getExecOutput("git", ["rev-parse", "HEAD"]);
    const hash = stdout.trim();
    setOutput("commit-hash", hash);
    return hash;
  } catch (error) {
    setFailed(`Failed to get commit hash: ${error}`);
    return "";
  } finally {
    endGroup();
  }
}
