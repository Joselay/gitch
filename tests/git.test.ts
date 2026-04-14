import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyProfileLocally,
  clearProfileLocally,
  clearUrlRewrites,
  getGlobalConfig,
  getLocalConfig,
  setGlobalConfig,
  setLocalConfig,
  setUrlRewrite,
  unsetGlobalConfig,
  unsetLocalConfig,
} from "../src/core/git.ts";

let repoDir: string;

beforeEach(async () => {
  repoDir = await mkdtemp(join(tmpdir(), "gitego-git-test-"));
  await Bun.$`git init ${repoDir}`.quiet();
});

afterEach(async () => {
  await rm(repoDir, { recursive: true, force: true });
});

// Clean up any global config we set during tests
const globalKeysToClean: string[] = [];
afterAll(async () => {
  for (const key of globalKeysToClean) {
    try {
      await Bun.$`git config --global --unset ${key}`.quiet();
    } catch {
      // may not exist
    }
  }
});

describe("local config", () => {
  test("setLocalConfig and getLocalConfig round-trip", async () => {
    await setLocalConfig("user.name", "Test User", repoDir);
    const value = await getLocalConfig("user.name", repoDir);
    expect(value).toBe("Test User");
  });

  test("getLocalConfig returns null for unset key", async () => {
    const value = await getLocalConfig("user.name", repoDir);
    expect(value).toBeNull();
  });

  test("unsetLocalConfig removes a key", async () => {
    await setLocalConfig("user.name", "Test User", repoDir);
    await unsetLocalConfig("user.name", repoDir);
    const value = await getLocalConfig("user.name", repoDir);
    expect(value).toBeNull();
  });

  test("unsetLocalConfig does not throw for missing key", async () => {
    expect(async () => {
      await unsetLocalConfig("user.nonexistent", repoDir);
    }).not.toThrow();
  });
});

describe("applyProfileLocally", () => {
  test("sets name, email, and sshCommand", async () => {
    await applyProfileLocally("Alice", "alice@test.com", "ssh -i /key", repoDir);
    expect(await getLocalConfig("user.name", repoDir)).toBe("Alice");
    expect(await getLocalConfig("user.email", repoDir)).toBe("alice@test.com");
    expect(await getLocalConfig("core.sshCommand", repoDir)).toBe("ssh -i /key");
  });
});

describe("clearProfileLocally", () => {
  test("clears name, email, and sshCommand", async () => {
    await applyProfileLocally("Alice", "alice@test.com", "ssh -i /key", repoDir);
    await clearProfileLocally(repoDir);
    expect(await getLocalConfig("user.name", repoDir)).toBeNull();
    expect(await getLocalConfig("user.email", repoDir)).toBeNull();
    expect(await getLocalConfig("core.sshCommand", repoDir)).toBeNull();
  });

  test("does not throw when keys are already unset", async () => {
    // clearProfileLocally on a fresh repo where keys were never set should succeed
    await expect(clearProfileLocally(repoDir)).resolves.toBeUndefined();
  });
});

describe("global config helpers", () => {
  const testKey = "gitego-test.tempvalue";

  afterEach(async () => {
    try {
      await Bun.$`git config --global --unset ${testKey}`.quiet();
    } catch {
      // already unset
    }
  });

  test("setGlobalConfig and getGlobalConfig round-trip", async () => {
    await setGlobalConfig(testKey, "hello");
    globalKeysToClean.push(testKey);
    const value = await getGlobalConfig(testKey);
    expect(value).toBe("hello");
  });

  test("getGlobalConfig returns null for unset key", async () => {
    const value = await getGlobalConfig("gitego-test.doesnotexist");
    expect(value).toBeNull();
  });

  test("unsetGlobalConfig removes the key", async () => {
    await setGlobalConfig(testKey, "hello");
    globalKeysToClean.push(testKey);
    await unsetGlobalConfig(testKey);
    const value = await getGlobalConfig(testKey);
    expect(value).toBeNull();
  });
});

describe("URL rewrites", () => {
  afterEach(async () => {
    await clearUrlRewrites();
  });

  test("setUrlRewrite creates insteadOf rule", async () => {
    await setUrlRewrite("work");
    const key = "url.git@github.com-work:.insteadOf";
    const value = await getGlobalConfig(key);
    expect(value).toBe("git@github.com:");
  });

  test("clearUrlRewrites removes all gitego rewrites", async () => {
    await setUrlRewrite("work");
    await setUrlRewrite("personal");
    await clearUrlRewrites();
    const val1 = await getGlobalConfig("url.git@github.com-work:.insteadOf");
    const val2 = await getGlobalConfig("url.git@github.com-personal:.insteadOf");
    expect(val1).toBeNull();
    expect(val2).toBeNull();
  });

  test("clearUrlRewrites does not throw when no rewrites exist", async () => {
    expect(async () => {
      await clearUrlRewrites();
    }).not.toThrow();
  });
});
