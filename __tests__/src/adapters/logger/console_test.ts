/**
 * Tests for ConsoleLogger
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { ConsoleLogger } from "~/adapters/logger/console.ts";
import {
  captureConsole,
  ExitStubError,
  stubEnv,
  stubExit,
} from "~/testing/mod.ts";

// --- Basic logging tests ---

Deno.test("ConsoleLogger - info logs with [info] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.info("test message");

    assertEquals(captured.infos.length, 1);
    assertStringIncludes(captured.infos[0], "[info]");
    assertStringIncludes(captured.infos[0], "test message");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - warn logs with [warn] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.warn("warning message");

    assertEquals(captured.warns.length, 1);
    assertStringIncludes(captured.warns[0], "[warn]");
    assertStringIncludes(captured.warns[0], "warning message");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - error logs with [error] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.error("error message");

    assertEquals(captured.errors.length, 1);
    assertStringIncludes(captured.errors[0], "[error]");
    assertStringIncludes(captured.errors[0], "error message");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - notice logs with [notice] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.notice("notice message");

    assertEquals(captured.infos.length, 1);
    assertStringIncludes(captured.infos[0], "[notice]");
    assertStringIncludes(captured.infos[0], "notice message");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - success logs with [+] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.success("success message");

    assertEquals(captured.logs.length, 1);
    assertStringIncludes(captured.logs[0], "[+]");
    assertStringIncludes(captured.logs[0], "success message");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - skip logs with [-] prefix", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.skip("skip message");

    assertEquals(captured.logs.length, 1);
    assertStringIncludes(captured.logs[0], "[-]");
    assertStringIncludes(captured.logs[0], "skip message");
  } finally {
    captured.restore();
  }
});

// --- Debug logging tests ---

Deno.test("ConsoleLogger - debug does not log without DEBUG env", () => {
  const restoreEnv = stubEnv({ DEBUG: undefined });
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.debug("debug message");

    assertEquals(captured.debugs.length, 0);
  } finally {
    captured.restore();
    restoreEnv();
  }
});

Deno.test("ConsoleLogger - debug logs with DEBUG env set", () => {
  const restoreEnv = stubEnv({ DEBUG: "true" });
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.debug("debug message");

    assertEquals(captured.debugs.length, 1);
    assertStringIncludes(captured.debugs[0], "[debug]");
    assertStringIncludes(captured.debugs[0], "debug message");
  } finally {
    captured.restore();
    restoreEnv();
  }
});

// --- Annotation tests ---

Deno.test("ConsoleLogger - warn includes file annotation", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.warn("warning", { file: "test.yml", startLine: 5 });

    assertStringIncludes(captured.warns[0], "test.yml:5");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - error includes file and column annotation", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.error("error", { file: "test.yml", startLine: 10, startColumn: 3 });

    assertStringIncludes(captured.errors[0], "test.yml:10:3");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - notice includes title annotation", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.notice("notice", { title: "Important" });

    assertStringIncludes(captured.infos[0], "Important");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - annotation with file and title", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.warn("warning", {
      file: "config.yml",
      startLine: 1,
      title: "Label",
    });

    assertStringIncludes(captured.warns[0], "config.yml:1");
    assertStringIncludes(captured.warns[0], "Label");
  } finally {
    captured.restore();
  }
});

// --- Group tests ---

Deno.test("ConsoleLogger - startGroup logs group name", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.startGroup("my-group");

    assertEquals(captured.infos.length, 1);
    assertStringIncludes(captured.infos[0], "my-group");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - startGroup/endGroup affects indentation", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.info("before");
    logger.startGroup("group1");
    logger.info("inside");
    logger.endGroup();
    logger.info("after");

    // "inside" should have more leading spaces than "before" and "after"
    const beforeLen = captured.infos[0].indexOf("[info]");
    const insideLen = captured.infos[2].indexOf("[info]");
    const afterLen = captured.infos[3].indexOf("[info]");

    assertEquals(insideLen > beforeLen, true, "inside should be indented");
    assertEquals(afterLen, beforeLen, "after should match before indentation");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - endGroup does nothing when no group", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.endGroup(); // Should not throw
    logger.info("test");

    assertEquals(captured.infos.length, 1);
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - group wraps async function", async () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    const result = await logger.group("my-group", () => {
      logger.info("inside group");
      return Promise.resolve(42);
    });

    assertEquals(result, 42);
    assertEquals(captured.infos.length, 2); // group name + inside message
    assertStringIncludes(captured.infos[0], "my-group");
  } finally {
    captured.restore();
  }
});

Deno.test("ConsoleLogger - nested groups increase indentation", () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    logger.startGroup("outer");
    logger.info("level 1");
    logger.startGroup("inner");
    logger.info("level 2");
    logger.endGroup();
    logger.info("back to level 1");
    logger.endGroup();

    const level1First = captured.infos[1].indexOf("[info]");
    const level2 = captured.infos[3].indexOf("[info]");
    const level1Second = captured.infos[4].indexOf("[info]");

    assertEquals(level2 > level1First, true, "level 2 should be more indented");
    assertEquals(level1Second, level1First, "back to level 1 indentation");
  } finally {
    captured.restore();
  }
});

// --- setFailed tests ---

Deno.test("ConsoleLogger - setFailed logs error and calls Deno.exit", () => {
  const captured = captureConsole();
  const exitStub = stubExit();
  try {
    const logger = new ConsoleLogger();
    try {
      logger.setFailed("failure message");
    } catch (e) {
      if (!(e instanceof ExitStubError)) throw e;
    }

    assertEquals(captured.errors.length, 1);
    assertStringIncludes(captured.errors[0], "failure message");
    assertEquals(exitStub.exitCodes, [1]);
  } finally {
    captured.restore();
    exitStub.restore();
  }
});

Deno.test("ConsoleLogger - setFailed handles Error object", () => {
  const captured = captureConsole();
  const exitStub = stubExit();
  try {
    const logger = new ConsoleLogger();
    try {
      logger.setFailed(new Error("error object message"));
    } catch (e) {
      if (!(e instanceof ExitStubError)) throw e;
    }

    assertEquals(captured.errors.length, 1);
    assertStringIncludes(captured.errors[0], "error object message");
    assertEquals(exitStub.exitCodes, [1]);
  } finally {
    captured.restore();
    exitStub.restore();
  }
});

// --- writeSummary tests ---

Deno.test("ConsoleLogger - writeSummary is a no-op", async () => {
  const captured = captureConsole();
  try {
    const logger = new ConsoleLogger();
    await logger.writeSummary({
      success: true,
      summary: {
        created: 1,
        updated: 0,
        renamed: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
      },
      operations: [],
    });

    // Should not produce any output
    assertEquals(captured.all.length, 0);
  } finally {
    captured.restore();
  }
});
