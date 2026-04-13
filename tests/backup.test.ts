import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDir = await mkdtemp(join(tmpdir(), "gitch-backup-"));
process.env.GITCH_CONFIG_DIR = testDir;

// Dynamic import so modules read our GITCH_CONFIG_DIR
const { createBackup } = await import("../src/core/backup.ts");
const { getBackupsDir, getConfigPath, saveConfig } = await import("../src/core/config.ts");
const { createDefaultConfig } = await import("../src/types.ts");

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

beforeEach(async () => {
  // Clean backup dir between tests
  const backupsDir = getBackupsDir();
  try {
    const files = await readdir(backupsDir);
    for (const file of files) {
      await rm(join(backupsDir, file));
    }
  } catch {
    // dir may not exist yet
  }
  // Remove config file
  try {
    const configPath = getConfigPath();
    if (await Bun.file(configPath).exists()) {
      await rm(configPath);
    }
  } catch {
    // may not exist
  }
});

describe("createBackup", () => {
  test("returns null when no config file exists", async () => {
    const result = await createBackup();
    expect(result).toBeNull();
  });

  test("creates backup file when config exists", async () => {
    await saveConfig(createDefaultConfig());
    const backupPath = await createBackup();
    expect(backupPath).not.toBeNull();
    expect(backupPath).toContain("config-");
    expect(backupPath).toContain(".json");

    if (!backupPath) throw new Error("Expected backupPath to be non-null");
    const backupFile = Bun.file(backupPath);
    expect(await backupFile.exists()).toBe(true);

    const content = await backupFile.json();
    expect(content.version).toBe(1);
  });

  test("creates unique backup files on repeated calls", async () => {
    await saveConfig(createDefaultConfig());
    const path1 = await createBackup();
    // Small delay to ensure different timestamp
    await Bun.sleep(10);
    const path2 = await createBackup();
    expect(path1).not.toBe(path2);
  });
});

describe("pruneBackups", () => {
  test("keeps at most 10 backups", async () => {
    await saveConfig(createDefaultConfig());

    // Create 12 backups
    for (let i = 0; i < 12; i++) {
      await createBackup();
      await Bun.sleep(10);
    }

    const backupsDir = getBackupsDir();
    const files = (await readdir(backupsDir)).filter((f) => f.startsWith("config-"));
    expect(files.length).toBeLessThanOrEqual(10);
  });
});
