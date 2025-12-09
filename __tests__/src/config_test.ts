/**
 * Tests for config module
 */

import { assertEquals, assertExists } from "@std/assert";
import { parse } from "yaml";
import { Ajv } from "ajv";
import { isLabelConfig, loadConfig } from "~/config.ts";

// --- isLabelConfig tests ---

Deno.test("isLabelConfig - validates correct minimal schema", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug report" }],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - validates schema with aliases", () => {
  const valid = {
    labels: [
      {
        name: "bug",
        color: "ff0000",
        description: "Bug report",
        aliases: ["defect", "issue"],
      },
    ],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - validates schema with delete array", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug report" }],
    delete: ["old-label", "deprecated"],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - rejects null", () => {
  assertEquals(isLabelConfig(null), false);
});

Deno.test("isLabelConfig - rejects undefined", () => {
  assertEquals(isLabelConfig(undefined), false);
});

Deno.test("isLabelConfig - rejects non-object", () => {
  assertEquals(isLabelConfig("string"), false);
  assertEquals(isLabelConfig(123), false);
  assertEquals(isLabelConfig([]), false);
});

Deno.test("isLabelConfig - rejects missing labels array", () => {
  assertEquals(isLabelConfig({}), false);
  assertEquals(isLabelConfig({ delete: ["foo"] }), false);
});

Deno.test("isLabelConfig - rejects labels as non-array", () => {
  assertEquals(isLabelConfig({ labels: "not-array" }), false);
  assertEquals(isLabelConfig({ labels: {} }), false);
  assertEquals(isLabelConfig({ labels: null }), false);
});

Deno.test("isLabelConfig - rejects label with missing name", () => {
  const invalid = {
    labels: [{ color: "ff0000", description: "Bug" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - accepts label with missing color", () => {
  const valid = {
    labels: [{ name: "bug", description: "Bug" }],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - accepts label with missing description", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000" }],
  };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - rejects label with non-string name", () => {
  const invalid = {
    labels: [{ name: 123, color: "ff0000", description: "Bug" }],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects aliases with non-string items", () => {
  const invalid = {
    labels: [
      { name: "bug", color: "ff0000", description: "Bug", aliases: [123] },
    ],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects aliases with mixed types", () => {
  const invalid = {
    labels: [
      {
        name: "bug",
        color: "ff0000",
        description: "Bug",
        aliases: ["valid", 123, "also-valid"],
      },
    ],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects delete with non-string items", () => {
  const invalid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: [123],
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - rejects delete as non-array", () => {
  const invalid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: "not-array",
  };
  assertEquals(isLabelConfig(invalid), false);
});

Deno.test("isLabelConfig - accepts empty labels array", () => {
  const valid = { labels: [] };
  assertEquals(isLabelConfig(valid), true);
});

Deno.test("isLabelConfig - accepts empty delete array", () => {
  const valid = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    delete: [],
  };
  assertEquals(isLabelConfig(valid), true);
});

// --- JSON Schema validation tests ---

async function loadSchema(): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(".github/labels.schema.json");
  return JSON.parse(content);
}

async function loadLabelsYml(): Promise<unknown> {
  const content = await Deno.readTextFile(".github/labels.yml");
  return parse(content);
}

Deno.test("schema - labels.yml validates against generated schema", async () => {
  const schema = await loadSchema();
  const config = await loadLabelsYml();

  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(config);

  if (!valid) {
    console.error("Validation errors:", validate.errors);
  }
  assertEquals(valid, true);
});

Deno.test("schema - valid config passes schema validation", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const validConfig = {
    labels: [
      { name: "bug", color: "#ff0000", description: "Bug report" },
      {
        name: "feature",
        color: "00ff00",
        description: "New feature",
        aliases: ["enhancement"],
      },
    ],
    delete: ["old-label"],
  };

  assertEquals(validate(validConfig), true);
});

Deno.test("schema - rejects invalid color format", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const invalidConfig = {
    labels: [
      { name: "bug", color: "invalid", description: "Bug report" },
    ],
  };

  assertEquals(validate(invalidConfig), false);
  assertExists(validate.errors);
  assertEquals(validate.errors[0].keyword, "pattern");
});

Deno.test("schema - accepts 3-character hex color", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const config = {
    labels: [{ name: "bug", color: "#f00", description: "Bug" }],
  };

  assertEquals(validate(config), true);
});

Deno.test("schema - rejects missing required fields", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  // Missing name
  assertEquals(
    validate({ labels: [{ color: "ff0000", description: "Bug" }] }),
    false,
  );

  // Missing labels array entirely
  assertEquals(validate({ delete: ["foo"] }), false);
});

Deno.test("schema - accepts optional fields (color, description)", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  // Missing color
  assertEquals(
    validate({ labels: [{ name: "bug", description: "Bug" }] }),
    true,
  );

  // Missing description
  assertEquals(
    validate({ labels: [{ name: "bug", color: "ff0000" }] }),
    true,
  );

  // Missing both
  assertEquals(
    validate({ labels: [{ name: "bug" }] }),
    true,
  );
});

Deno.test("schema - rejects additional properties", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const invalidConfig = {
    labels: [{ name: "bug", color: "ff0000", description: "Bug" }],
    extraField: "not allowed",
  };

  assertEquals(validate(invalidConfig), false);
});

Deno.test("schema - accepts valid hex colors", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const testCases = [
    "ff0000", // without #
    "#ff0000", // with #
    "FF0000", // uppercase
    "#AABBCC", // uppercase with #
    "123abc", // mixed
    "#f00", // 3-char with #
    "abc", // 3-char without #
    "ABC", // 3-char uppercase
  ];

  for (const color of testCases) {
    const config = {
      labels: [{ name: "test", color, description: "Test" }],
    };
    assertEquals(validate(config), true, `Color ${color} should be valid`);
  }
});

Deno.test("schema - rejects invalid hex colors", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const testCases = [
    "gggggg", // invalid hex chars
    "ff00", // 4 chars
    "#ff00000", // 7 chars
    "red", // color name
    "", // empty
  ];

  for (const color of testCases) {
    const config = {
      labels: [{ name: "test", color, description: "Test" }],
    };
    assertEquals(validate(config), false, `Color ${color} should be invalid`);
  }
});

// --- Type guard vs Schema consistency tests ---

Deno.test("consistency - isLabelConfig and schema agree on valid configs", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const validConfigs = [
    { labels: [] },
    { labels: [{ name: "bug", color: "ff0000", description: "Bug" }] },
    {
      labels: [{ name: "a", color: "000000", description: "b", aliases: [] }],
    },
    {
      labels: [{ name: "a", color: "#ffffff", description: "b" }],
      delete: ["old"],
    },
  ];

  for (const config of validConfigs) {
    const schemaResult = validate(config);
    const typeGuardResult = isLabelConfig(config);
    assertEquals(
      schemaResult,
      typeGuardResult,
      `Mismatch for config: ${JSON.stringify(config)}`,
    );
  }
});

Deno.test("consistency - isLabelConfig and schema agree on invalid structure", () => {
  const schema = JSON.parse(
    Deno.readTextFileSync(".github/labels.schema.json"),
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const invalidConfigs = [
    {}, // missing labels
    { labels: "not-array" },
    { labels: [{ name: 123, color: "ff0000", description: "Bug" }] },
    { labels: [{ color: "ff0000", description: "Bug" }] }, // missing name
  ];

  for (const config of invalidConfigs) {
    const schemaResult = validate(config);
    const typeGuardResult = isLabelConfig(config);
    assertEquals(
      schemaResult,
      typeGuardResult,
      `Mismatch for invalid config: ${JSON.stringify(config)}`,
    );
  }
});

// --- Line number extraction tests ---

Deno.test("loadConfig - extracts line numbers for labels", async () => {
  // Create a temp file with known line numbers
  const yaml = `labels:
  - name: bug
    color: d73a4a
    description: Bug report
  - name: feature
    color: a2eeef
    description: New feature
`;
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, yaml);

  try {
    const config = await loadConfig(tempFile);

    assertExists(config._meta);
    assertEquals(config?._meta.filePath, tempFile);

    // Line numbers are 1-based
    // "bug" appears on line 2 (name: bug)
    // "feature" appears on line 5 (name: feature)
    assertEquals(config?._meta.labelLines["bug"], 2);
    assertEquals(config?._meta.labelLines["feature"], 5);
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("loadConfig - extracts line numbers for delete entries", async () => {
  const yaml = `labels:
  - name: bug
    color: d73a4a
    description: Bug report
delete:
  - old-label
  - deprecated
`;
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, yaml);

  try {
    const config = await loadConfig(tempFile);

    assertExists(config._meta);
    assertEquals(config._meta.deleteLines["old-label"], 6);
    assertEquals(config._meta.deleteLines["deprecated"], 7);
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("loadConfig - handles config without delete section", async () => {
  const yaml = `labels:
  - name: test
    color: ffffff
    description: Test label
`;
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, yaml);

  try {
    const config = await loadConfig(tempFile);

    assertExists(config._meta);
    assertEquals(config._meta.labelLines["test"], 2);
    assertEquals(Object.keys(config._meta.deleteLines).length, 0);
  } finally {
    await Deno.remove(tempFile);
  }
});

// --- getEnv tests ---

import { assertThrows } from "@std/assert";
import { ConfigError, getEnv } from "~/config.ts";
import { stubArgs, stubEnv } from "~/testing.ts";

Deno.test("getEnv - requires GITHUB_TOKEN", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: undefined });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    assertThrows(
      () => getEnv(),
      ConfigError,
      "GITHUB_TOKEN is required",
    );
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - requires repository argument", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", REPO: undefined });
  const restoreArgs = stubArgs([]);
  try {
    assertThrows(
      () => getEnv(),
      ConfigError,
      "Repository required",
    );
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - rejects invalid repository format", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["invalid-repo"]);
  try {
    assertThrows(
      () => getEnv(),
      ConfigError,
      "Invalid repository format",
    );
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - rejects repo with empty owner", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["/repo"]);
  try {
    assertThrows(
      () => getEnv(),
      ConfigError,
      "Invalid repository format",
    );
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - rejects repo with empty name", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/"]);
  try {
    assertThrows(
      () => getEnv(),
      ConfigError,
      "Invalid repository format",
    );
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - parses valid owner/repo from args", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "my-token" });
  const restoreArgs = stubArgs(["my-org/my-repo"]);
  try {
    const env = getEnv();
    assertEquals(env.owner, "my-org");
    assertEquals(env.repo, "my-repo");
    assertEquals(env.token, "my-token");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - falls back to REPO env var", () => {
  const restoreEnv = stubEnv({
    GITHUB_TOKEN: "token",
    REPO: "env-owner/env-repo",
  });
  const restoreArgs = stubArgs([]);
  try {
    const env = getEnv();
    assertEquals(env.owner, "env-owner");
    assertEquals(env.repo, "env-repo");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - CLI arg takes precedence over REPO env", () => {
  const restoreEnv = stubEnv({
    GITHUB_TOKEN: "token",
    REPO: "env-owner/env-repo",
  });
  const restoreArgs = stubArgs(["cli-owner/cli-repo"]);
  try {
    const env = getEnv();
    assertEquals(env.owner, "cli-owner");
    assertEquals(env.repo, "cli-repo");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// --- dryRun flag tests ---

Deno.test("getEnv - dryRun is false by default", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", DRY_RUN: undefined });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    const env = getEnv();
    assertEquals(env.dryRun, false);
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - dryRun from --dry-run flag", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/repo", "--dry-run"]);
  try {
    const env = getEnv();
    assertEquals(env.dryRun, true);
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - dryRun from DRY_RUN env var", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", DRY_RUN: "true" });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    const env = getEnv();
    assertEquals(env.dryRun, true);
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - DRY_RUN=false is not dry run", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", DRY_RUN: "false" });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    const env = getEnv();
    assertEquals(env.dryRun, false);
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// --- config path tests ---

Deno.test("getEnv - uses default config path", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token", CONFIG_PATH: undefined });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    const env = getEnv();
    assertEquals(env.configPath, ".github/labels.yml");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - uses CONFIG_PATH env var", () => {
  const restoreEnv = stubEnv({
    GITHUB_TOKEN: "token",
    CONFIG_PATH: "custom/path.yml",
  });
  const restoreArgs = stubArgs(["owner/repo"]);
  try {
    const env = getEnv();
    assertEquals(env.configPath, "custom/path.yml");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - --config flag takes precedence over env", () => {
  const restoreEnv = stubEnv({
    GITHUB_TOKEN: "token",
    CONFIG_PATH: "env/path.yml",
  });
  const restoreArgs = stubArgs(["owner/repo", "--config", "cli/path.yml"]);
  try {
    const env = getEnv();
    assertEquals(env.configPath, "cli/path.yml");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - --config=value syntax works", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs(["owner/repo", "--config=equals/path.yml"]);
  try {
    const env = getEnv();
    assertEquals(env.configPath, "equals/path.yml");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// --- Positional argument extraction tests ---

Deno.test("getEnv - ignores flags in positional args", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs([
    "--dry-run",
    "owner/repo",
    "--config",
    "path.yml",
  ]);
  try {
    const env = getEnv();
    assertEquals(env.owner, "owner");
    assertEquals(env.repo, "repo");
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

Deno.test("getEnv - handles --config=value in middle of args", () => {
  const restoreEnv = stubEnv({ GITHUB_TOKEN: "token" });
  const restoreArgs = stubArgs([
    "--config=custom.yml",
    "owner/repo",
    "--dry-run",
  ]);
  try {
    const env = getEnv();
    assertEquals(env.owner, "owner");
    assertEquals(env.repo, "repo");
    assertEquals(env.configPath, "custom.yml");
    assertEquals(env.dryRun, true);
  } finally {
    restoreArgs();
    restoreEnv();
  }
});

// --- loadConfig error handling tests ---

import { assertRejects } from "@std/assert";

Deno.test("loadConfig - throws on file not found", async () => {
  await assertRejects(
    () => loadConfig("nonexistent/path.yml"),
    Deno.errors.NotFound,
  );
});

Deno.test("loadConfig - throws on invalid YAML", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "invalid: yaml: content: [");
  try {
    await assertRejects(
      () => loadConfig(tempFile),
      Deno.errors.InvalidData,
    );
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("loadConfig - throws on invalid schema", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "wrong: schema");
  try {
    await assertRejects(
      () => loadConfig(tempFile),
      Deno.errors.InvalidData,
      "Invalid labels.yml schema",
    );
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("loadConfig - uses CONFIG_PATH env if path not provided", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(
    tempFile,
    `labels:
  - name: test
    color: ffffff
    description: Test`,
  );
  const restoreEnv = stubEnv({ CONFIG_PATH: tempFile });
  try {
    const config = await loadConfig();
    assertEquals(config.labels[0].name, "test");
  } finally {
    restoreEnv();
    await Deno.remove(tempFile);
  }
});

Deno.test("loadConfig - accepts empty labels array", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  await Deno.writeTextFile(tempFile, "labels: []");
  try {
    const config = await loadConfig(tempFile);
    assertEquals(config.labels, []);
    assertExists(config._meta);
    assertEquals(Object.keys(config._meta.labelLines).length, 0);
  } finally {
    await Deno.remove(tempFile);
  }
});
