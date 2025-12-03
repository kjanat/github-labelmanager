# Pre-Launch TODO Plan

## Critical Blockers

### 1. Unhandled main() promise

**File:** `main.ts:383`

```typescript
// Current
if (import.meta.main) {
  main();
}

// Fix
if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}
```

---

### 2. Docker reads wrong config path

**File:** `main.ts:292`

The action reads bundled `/app/.github/labels.yml` instead of user's repo
config.

```typescript
// Current
const configPath = new URL("./.github/labels.yml", import.meta.url);

// Fix
const configPath = Deno.env.get("CONFIG_PATH") ?? ".github/labels.yml";
const configContent = await Deno.readTextFile(configPath);
```

Also update `Dockerfile:11` to mount workspace correctly.

---

### 3. CRUD errors swallowed silently

**Files:** `main.ts:209,235,252`

Errors logged but not propagated. Caller believes success.

```typescript
// Current
} catch (error) {
  this.handleError("Create", error)
}

// Fix - track failures
private failures: string[] = []

} catch (error) {
  this.handleError("Create", error)
  this.failures.push(`Create ${options.name}`)
}

// At end of sync, check failures array and exit(1) if non-empty
```

---

### 4. List failure returns empty array

**File:** `main.ts:165-168`

Auth/network error causes ALL labels to appear "new" and get recreated.

```typescript
// Current
} catch (error) {
  this.handleError("List", error)
  return []
}

// Fix - throw to caller
} catch (error) {
  this.handleError("List", error)
  throw error  // Let caller handle
}
```

---

## High Priority

### 5. CONFIG_PATH input unused

**Files:** `action.yml:12`, `main.ts:292`

The `config-path` action input is passed as env but never read.

Fix: See item #2 above.

---

### 6. No YAML schema validation

**File:** `main.ts:294`

```typescript
// Current
config = parse(configContent) as LabelConfig;

// Fix - add validation
function isLabelConfig(obj: unknown): obj is LabelConfig {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.labels)) return false;
  return o.labels.every(
    (l) =>
      typeof l === "object" &&
      l !== null &&
      typeof (l as Record<string, unknown>).name === "string" &&
      typeof (l as Record<string, unknown>).color === "string",
  );
}

const parsed = parse(configContent);
if (!isLabelConfig(parsed)) {
  throw new Error("Invalid labels.yml schema");
}
config = parsed;
```

---

### 7. Unsafe owner/repo split

**File:** `main.ts:75`

```typescript
// Current
const [owner, repo] = repoArg.split("/");

// Fix
const parts = repoArg.split("/");
if (parts.length !== 2 || !parts[0] || !parts[1]) {
  console.error("Invalid repository format. Expected: owner/repo");
  Deno.exit(1);
}
const [owner, repo] = parts;
```

---

## Medium Priority

### 8. README claims unpublished packages

**File:** `README.md:18-28`

JSR and NPM install commands shown but packages not published.

Fix: Add "Coming Soon" badges or remove sections until published.

---

### 9. Pin Docker image version

**File:** `Dockerfile:2,8`

```dockerfile
# Current
FROM denoland/deno:latest

# Fix
FROM denoland/deno:2.1.4
```

---

### 10. Scope Deno permissions

**Files:** `main.ts:1`, `deno.json:40-41`

```typescript
// Current shebang
#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

// Fix
#!/usr/bin/env -S deno run --allow-net=api.github.com --allow-read=.github --allow-env
```

---

### 11. No rate limit handling

Add retry logic with exponential backoff for GitHub API calls.

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Unreachable");
}
```

---

## Low Priority

### 12. labels:dry-run hardcodes repo

**File:** `deno.json:41`

```json
// Current
"labels:dry-run": "deno run ... main.ts kjanat/github-labelmanager --dry-run"

// Fix
"labels:dry-run": "deno run ... main.ts --dry-run"
```

Also fix arg parsing order in `main.ts` to handle flags before positional args.

---

### 13. No tests exist

**File:** `AGENTS.md:11`

Create basic test file:

```typescript
// main_test.ts
import { assertEquals } from "jsr:@std/assert";

Deno.test("placeholder", () => {
  assertEquals(1 + 1, 2);
});
```

---

### 14. Format check allows failures

**File:** `.github/workflows/ci.yml:22`

```yaml
# Current
- run: deno fmt --check
  continue-on-error: true

# Fix - remove continue-on-error or keep intentionally
```

---

## Implementation Order

1. Fix #1 (unhandled promise) - 5 min
2. Fix #2 + #5 (config path) - 15 min
3. Fix #3 + #4 (error propagation) - 30 min
4. Fix #6 (YAML validation) - 20 min
5. Fix #7 (repo split) - 10 min
6. Fix #9 (Docker pin) - 5 min
7. Fix #8 (README) - 10 min
8. Fix #10 (permissions) - 10 min
9. Fix #12 (dry-run task) - 5 min
10. Add #13 (basic test) - 15 min
11. Add #11 (rate limiting) - 30 min

**Total estimate:** ~2.5 hours for all fixes
