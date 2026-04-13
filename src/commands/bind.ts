import { resolve } from "node:path";
import type { CAC } from "cac";
import {
  loadConfig,
  saveConfig,
  getProfile,
  addBinding,
} from "../core/config.ts";
import { setLocalConfig } from "../core/git.ts";
import { createBackup } from "../core/backup.ts";
import * as out from "../ui/output.ts";

export function registerBind(program: CAC): void {
  program
    .command("bind <profile> [path]", "Bind a directory to a git profile")
    .action(async (profileName: string, path: string | undefined) => {
      const config = await loadConfig();
      const profile = getProfile(config, profileName);

      if (!profile) {
        out.error(`Profile "${profileName}" not found.`);
        out.dim("  Run 'gitch list' to see available profiles.");
        process.exit(1);
      }

      const absolutePath = resolve(path ?? ".");

      await createBackup();

      try {
        await setLocalConfig("user.name", profile.gitName);
        await setLocalConfig("user.email", profile.gitEmail);
      } catch {
        out.error(
          "Failed to set local git config. Is this a git repository?",
        );
        process.exit(1);
      }

      const updated = addBinding(config, absolutePath, profileName);
      await saveConfig(updated);

      out.success(
        `Bound "${absolutePath}" → ${profileName} (${profile.gitEmail})`,
      );
      out.dim(
        "  Add auto-switching: eval \"$(gitch init zsh)\" in your .zshrc",
      );
    });
}
