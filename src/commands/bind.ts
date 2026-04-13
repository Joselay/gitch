import { resolve } from "node:path";
import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { addBinding, getProfile, loadConfig, saveConfig } from "../core/config.ts";
import { setLocalConfig, unsetLocalConfig } from "../core/git.ts";
import { buildSSHCommand } from "../core/ssh.ts";
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

      const applied: string[] = [];
      try {
        await setLocalConfig("user.name", profile.gitName, absolutePath);
        applied.push("user.name");
        await setLocalConfig("user.email", profile.gitEmail, absolutePath);
        applied.push("user.email");
        await setLocalConfig("core.sshCommand", buildSSHCommand(profile.sshKeyPath), absolutePath);
      } catch {
        for (const key of applied) {
          await unsetLocalConfig(key, absolutePath);
        }
        out.error(`Failed to set local git config at "${absolutePath}". Is it a git repository?`);
        process.exit(1);
      }

      const updated = addBinding(config, absolutePath, profileName);
      await saveConfig(updated);

      out.success(`Bound "${absolutePath}" → ${profileName} (${profile.gitEmail})`);
      out.dim('  Add auto-switching: eval "$(gitch init zsh)" in your .zshrc');
    });
}
