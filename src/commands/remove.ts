import type { Command } from "commander";
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

export function registerRemove(program: Command): void {
  program
    .command("remove <profile>")
    .description("Remove a git profile")
    .action(async (profileName: string) => {
      const config = await loadConfig();

      if (!profileExists(config, profileName)) {
        out.error(`Profile "${profileName}" not found.`);
        process.exit(1);
      }

      const confirmed = await confirmAction(
        `Remove profile "${profileName}"? This cannot be undone.`,
      );

      if (!confirmed) {
        out.dim("Cancelled.");
        return;
      }

      await createBackup();
      await removeHostAlias(profileName);

      const updated = removeProfile(config, profileName);
      await saveConfig(updated);

      out.success(`Profile "${profileName}" removed.`);
    });
}
