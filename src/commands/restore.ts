import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { CAC } from "cac";
import { getBackupsDir, getConfigPath, saveConfig } from "../core/config.ts";
import type { GitchConfig } from "../types.ts";
import * as out from "../ui/output.ts";

async function listBackups(): Promise<string[]> {
  const backupsDir = getBackupsDir();
  try {
    const files = await readdir(backupsDir);
    return files.filter((f) => f.startsWith("config-") && f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

function formatBackupName(filename: string): string {
  // config-2024-01-15T12-30-00-000Z.json → 2024-01-15 12:30:00
  const match = filename.match(/^config-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return filename;
  return `${match[1]} ${match[2]}:${match[3]}:${match[4]}`;
}

export function registerRestore(program: CAC): void {
  program
    .command("restore [backup]", "Restore config from a backup")
    .option("--list", "List available backups")
    .action(async (backup: string | undefined, options: { list?: boolean }) => {
      const backups = await listBackups();

      if (backups.length === 0) {
        out.info("No backups found.");
        return;
      }

      if (options.list || !backup) {
        out.heading("Available backups:\n");
        for (let i = 0; i < backups.length; i++) {
          const file = backups[i];
          if (!file) continue;
          const index = i + 1;
          const isLatest = i === backups.length - 1;
          const suffix = isLatest ? " (latest)" : "";
          out.info(`  ${index}. ${formatBackupName(file)}${suffix}`);
        }
        if (!backup) {
          process.stdout.write("\n");
          out.dim("  Usage: gitch restore <number>  (e.g. gitch restore 1)");
          out.dim("  Or:    gitch restore latest");
        }
        return;
      }

      let targetFile: string | undefined;

      if (backup === "latest") {
        targetFile = backups[backups.length - 1];
      } else {
        const index = Number(backup);
        if (Number.isInteger(index) && index >= 1 && index <= backups.length) {
          targetFile = backups[index - 1];
        }
      }

      if (!targetFile) {
        out.error(
          `Invalid backup: "${backup}". Run 'gitch restore --list' to see available backups.`,
        );
        process.exit(1);
      }

      const backupPath = join(getBackupsDir(), targetFile);
      const file = Bun.file(backupPath);

      if (!(await file.exists())) {
        out.error("Backup file not found.");
        process.exit(1);
      }

      let config: GitchConfig;
      try {
        config = (await file.json()) as GitchConfig;
      } catch {
        out.error("Backup file is corrupted.");
        process.exit(1);
      }

      // Verify before writing
      const currentFile = Bun.file(getConfigPath());
      if (await currentFile.exists()) {
        out.dim(`  Overwriting current config with backup: ${formatBackupName(targetFile)}`);
      }

      await saveConfig(config);
      out.success(`Config restored from backup: ${formatBackupName(targetFile)}`);
    });
}
