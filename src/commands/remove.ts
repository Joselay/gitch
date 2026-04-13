import type { CAC } from "cac";
import {
  loadConfig,
  saveConfig,
  profileExists,
  removeProfile,
} from "../core/config.ts";
import { removeHostAlias } from "../core/ssh.ts";
import { createBackup } from "../core/backup.ts";
import { confirmAction } from "../ui/prompts.ts";
import * as out from "../ui/output.ts";

export function registerRemove(program: CAC): void {
  program
    .command("remove <profile>", "Remove a git profile")
    .option("--yes", "Skip confirmation (headless)")
    .action(async (profileName: string, options: { yes?: boolean }) => {
      const config = await loadConfig();

      if (!profileExists(config, profileName)) {
        out.error(`Profile "${profileName}" not found.`);
        process.exit(1);
      }

      if (!options.yes) {
        const confirmed = await confirmAction(
          `Remove profile "${profileName}"? This cannot be undone.`,
        );

        if (!confirmed) {
          out.dim("Cancelled.");
          return;
        }
      }

      await createBackup();
      await removeHostAlias(profileName);

      const updated = removeProfile(config, profileName);
      await saveConfig(updated);

      out.success(`Profile "${profileName}" removed.`);
    });
}
