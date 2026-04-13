import { join } from "node:path";
import { getBackupsDir, getConfigPath, ensureConfigDir } from "./config.ts";

const MAX_BACKUPS = 10;

export async function createBackup(): Promise<string | null> {
  const configFile = Bun.file(getConfigPath());
  if (!(await configFile.exists())) {
    return null;
  }

  await ensureConfigDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(getBackupsDir(), `config-${timestamp}.json`);
  await Bun.write(backupPath, configFile);
  await pruneBackups();
  return backupPath;
}

async function pruneBackups(): Promise<void> {
  const glob = new Bun.Glob("config-*.json");
  const entries: string[] = [];

  for await (const entry of glob.scan({ cwd: getBackupsDir() })) {
    entries.push(entry);
  }

  if (entries.length <= MAX_BACKUPS) return;

  entries.sort();
  const toDelete = entries.slice(0, entries.length - MAX_BACKUPS);

  for (const file of toDelete) {
    await Bun.$`rm ${join(getBackupsDir(), file)}`.quiet();
  }
}
