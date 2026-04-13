import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GitchConfig } from "../src/types.ts";

const testDir = await mkdtemp(join(tmpdir(), "gitch-restore-"));
process.env.GITCH_CONFIG_DIR = testDir;

const { createBackup } = await import("../src/core/backup.ts");
const { getBackupsDir, getConfigPath, loadConfig, saveConfig } = await import(
  "../src/core/config.ts"
);
const { createDefaultConfig } = await import("../src/types.ts");

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

beforeEach(async () => {
  // Clean config and backup files
  const configPath = getConfigPath();
  try {
    if (await Bun.file(configPath).exists()) await rm(configPath);
  } catch {
    // may not exist
  }
  const backupsDir = getBackupsDir();
  try {
    const files = await readdir(backupsDir);
    for (const file of files) {
      await rm(join(backupsDir, file));
    }
  } catch {
    // dir may not exist
  }
});

describe("restore workflow", () => {
  test("backup contains the config state at time of backup", async () => {
    const original: GitchConfig = {
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
      bindings: [],
    };

    await saveConfig(original);
    const backupPath = await createBackup();
    expect(backupPath).not.toBeNull();

    // Modify config
    const modified: GitchConfig = {
      ...original,
      activeProfile: null,
      profiles: {},
    };
    await saveConfig(modified);

    // Verify current config is modified
    const currentConfig = await loadConfig();
    expect(Object.keys(currentConfig.profiles)).toHaveLength(0);

    // Restore from backup
    if (!backupPath) throw new Error("Expected backupPath");
    const backupContent = (await Bun.file(backupPath).json()) as GitchConfig;
    await saveConfig(backupContent);

    // Verify restored config matches original
    const restoredConfig = await loadConfig();
    expect(restoredConfig.activeProfile).toBe("work");
    expect(restoredConfig.profiles.work?.gitName).toBe("John");
  });

  test("backup files are listed in chronological order", async () => {
    await saveConfig(createDefaultConfig());
    await createBackup();
    await Bun.sleep(10);
    await createBackup();
    await Bun.sleep(10);
    await createBackup();

    const backupsDir = getBackupsDir();
    const files = (await readdir(backupsDir))
      .filter((f) => f.startsWith("config-") && f.endsWith(".json"))
      .sort();

    expect(files.length).toBe(3);
    // Files should be in ascending chronological order when sorted
    const [f0, f1, f2] = files;
    expect(f0 && f1 && f0 < f1).toBe(true);
    expect(f1 && f2 && f1 < f2).toBe(true);
  });
});
