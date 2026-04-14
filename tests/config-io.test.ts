import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EgoConfig } from "../src/types.ts";

const testDir = await mkdtemp(join(tmpdir(), "gitego-config-io-"));
process.env.GITEGO_CONFIG_DIR = testDir;

// Dynamic import so config.ts reads our GITEGO_CONFIG_DIR
const { loadConfig, saveConfig, getConfigPath } = await import("../src/core/config.ts");

const configPath = getConfigPath();

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

beforeEach(async () => {
  // Clean config file between tests
  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      await rm(configPath);
    }
  } catch {
    // file may not exist
  }
});

describe("loadConfig", () => {
  test("returns default config when no file exists", async () => {
    const config = await loadConfig();
    expect(config.version).toBe(1);
    expect(config.activeProfile).toBeNull();
    expect(config.profiles).toEqual({});
    expect(config.bindings).toEqual([]);
  });

  test("returns default config on corrupted JSON", async () => {
    await Bun.write(configPath, "not valid json {{{");
    const config = await loadConfig();
    expect(config.version).toBe(1);
    expect(config.profiles).toEqual({});
  });

  test("returns default config on invalid structure (missing profiles)", async () => {
    await Bun.write(configPath, JSON.stringify({ version: 1, bindings: [] }));
    const config = await loadConfig();
    expect(config.profiles).toEqual({});
  });

  test("returns default config on invalid structure (missing bindings)", async () => {
    await Bun.write(configPath, JSON.stringify({ version: 1, profiles: {} }));
    const config = await loadConfig();
    expect(config.profiles).toEqual({});
  });

  test("returns default config on wrong version", async () => {
    await Bun.write(configPath, JSON.stringify({ version: 99, profiles: {}, bindings: [] }));
    const config = await loadConfig();
    expect(config.version).toBe(1);
    expect(config.profiles).toEqual({});
  });

  test("strips invalid profiles and keeps valid ones", async () => {
    const data = {
      version: 1,
      activeProfile: null,
      profiles: {
        valid: {
          name: "valid",
          gitName: "Test",
          gitEmail: "test@test.com",
          sshKeyPath: "~/.ssh/id_test",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        broken: {
          name: "broken",
          // missing gitName, gitEmail, sshKeyPath, createdAt
        },
        alsobroken: "not an object",
      },
      bindings: [],
    };
    await Bun.write(configPath, JSON.stringify(data));
    const config = await loadConfig();
    expect(Object.keys(config.profiles)).toEqual(["valid"]);
    expect(config.profiles.valid?.gitName).toBe("Test");
  });

  test("resets activeProfile when it points to a stripped profile", async () => {
    const data = {
      version: 1,
      activeProfile: "broken",
      profiles: {
        broken: { name: "broken" }, // missing required fields
      },
      bindings: [],
    };
    await Bun.write(configPath, JSON.stringify(data));
    const config = await loadConfig();
    expect(config.activeProfile).toBeNull();
    expect(Object.keys(config.profiles)).toHaveLength(0);
  });

  test("loads valid config correctly", async () => {
    const data: EgoConfig = {
      version: 1,
      activeProfile: "work",
      profiles: {
        work: {
          name: "work",
          gitName: "John",
          gitEmail: "john@work.com",
          sshKeyPath: "~/.ssh/id_work",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      },
      bindings: [{ path: "/home/user/project", profile: "work" }],
    };
    await Bun.write(configPath, JSON.stringify(data));
    const config = await loadConfig();
    expect(config.activeProfile).toBe("work");
    expect(config.profiles.work?.gitName).toBe("John");
    expect(config.bindings).toHaveLength(1);
  });
});

describe("saveConfig", () => {
  test("round-trips config correctly", async () => {
    const data: EgoConfig = {
      version: 1,
      activeProfile: "personal",
      profiles: {
        personal: {
          name: "personal",
          gitName: "Jane",
          gitEmail: "jane@home.com",
          sshKeyPath: "~/.ssh/id_personal",
          createdAt: "2024-06-15T12:00:00.000Z",
        },
      },
      bindings: [{ path: "/projects/oss", profile: "personal" }],
    };

    await saveConfig(data);
    const loaded = await loadConfig();
    expect(loaded).toEqual(data);
  });

  test("sets file permissions to 600", async () => {
    const data: EgoConfig = {
      version: 1,
      activeProfile: null,
      profiles: {},
      bindings: [],
    };
    await saveConfig(data);
    const stats = await stat(configPath);
    // 0o600 = 384 decimal, check owner read/write only
    expect(stats.mode & 0o777).toBe(0o600);
  });
});
