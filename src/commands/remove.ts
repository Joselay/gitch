import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { loadConfig, profileExists, removeProfile, saveConfig } from "../core/config.ts";
import { clearUrlRewrites, unsetGlobalConfig } from "../core/git.ts";
import { removeHostAlias } from "../core/ssh.ts";
import * as out from "../ui/output.ts";
import { confirmAction } from "../ui/prompts.ts";

export function registerRemove(program: CAC): void {
  program
    .command("remove <profile>", "Remove a git profile")
    .option("--yes", "Skip confirmation (headless)")
    .action(async (profileName: string, options: { yes?: boolean }) => {
      const config = await loadConfig();

      if (!profileExists(config, profileName)) {
        out.error(`Profile "${profileName}" not found.`);
        out.dim("  Run 'gitego list' to see available profiles.");
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

      const wasActive = config.activeProfile === profileName;
      const updated = removeProfile(config, profileName);
      await saveConfig(updated);
      await removeHostAlias(profileName);

      if (wasActive) {
        await unsetGlobalConfig("user.name");
        await unsetGlobalConfig("user.email");
        await clearUrlRewrites();
        out.warn("Cleared global git identity (removed profile was active).");
      }

      out.success(`Profile "${profileName}" removed.`);
    });
}
