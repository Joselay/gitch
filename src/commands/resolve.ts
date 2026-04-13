import type { CAC } from "cac";
import { getBindingForPath, getProfile, loadConfig } from "../core/config.ts";
import { applyProfileLocally, getLocalConfig } from "../core/git.ts";
import { buildSSHCommand } from "../core/ssh.ts";

export function registerResolve(program: CAC): void {
  program
    .command("_resolve", "(internal) Resolve profile for current directory")
    .action(async () => {
      const config = await loadConfig();
      const cwd = process.cwd();

      const binding = getBindingForPath(config, cwd);
      if (!binding) return;

      const profile = getProfile(config, binding.profile);
      if (!profile) return;

      const [currentName, currentEmail] = await Promise.all([
        getLocalConfig("user.name"),
        getLocalConfig("user.email"),
      ]);

      if (currentName === profile.gitName && currentEmail === profile.gitEmail) {
        return;
      }

      try {
        await applyProfileLocally(
          profile.gitName,
          profile.gitEmail,
          buildSSHCommand(profile.sshKeyPath),
        );
        process.stdout.write(binding.profile);
      } catch {
        // not a git repo or no permissions — silently skip
      }
    });
}
