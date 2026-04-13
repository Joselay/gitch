import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { getProfile, loadConfig, saveConfig, setActiveProfile } from "../core/config.ts";
import { isGhInstalled, switchUser } from "../core/gh.ts";
import { clearUrlRewrites, setGlobalConfig, setUrlRewrite } from "../core/git.ts";
import * as out from "../ui/output.ts";

export function registerUse(program: CAC): void {
  program
    .command("use <profile>", "Switch to a git profile")
    .action(async (profileName: string) => {
      const config = await loadConfig();
      const profile = getProfile(config, profileName);

      if (!profile) {
        out.error(`Profile "${profileName}" not found.`);
        out.dim("  Run 'gitch list' to see available profiles.");
        process.exit(1);
      }

      await createBackup();

      try {
        await setGlobalConfig("user.name", profile.gitName);
        await setGlobalConfig("user.email", profile.gitEmail);
        out.success(`Git config → ${profile.gitName} <${profile.gitEmail}>`);
      } catch {
        out.error("Failed to set global git config. Is git installed?");
        process.exit(1);
      }

      try {
        await clearUrlRewrites();
        await setUrlRewrite(profileName);
        out.success(`SSH routing → git@github.com-${profileName}`);
      } catch {
        out.error("Failed to set SSH URL rewrite in git config.");
        process.exit(1);
      }

      if (profile.ghUsername) {
        if (await isGhInstalled()) {
          try {
            await switchUser(profile.ghUsername);
            out.success(`GitHub CLI → ${profile.ghUsername}`);
          } catch {
            out.warn(
              `Could not switch gh user to "${profile.ghUsername}". Run 'gh auth login' first.`,
            );
          }
        } else {
          out.warn("GitHub CLI (gh) not installed — skipping auth switch.");
        }
      }

      const updated = setActiveProfile(config, profileName);
      await saveConfig(updated);

      out.info(`\nActive profile: ${profileName}`);
    });
}
