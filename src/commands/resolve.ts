import type { CAC } from "cac";
import { loadConfig, getProfile, getBindingForPath } from "../core/config.ts";
import { getLocalConfig, setLocalConfig } from "../core/git.ts";

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

      const currentName = await getLocalConfig("user.name");
      const currentEmail = await getLocalConfig("user.email");

      if (currentName === profile.gitName && currentEmail === profile.gitEmail) {
        return;
      }

      try {
        await setLocalConfig("user.name", profile.gitName);
        await setLocalConfig("user.email", profile.gitEmail);
        process.stdout.write(binding.profile);
      } catch {
        // not a git repo or no permissions — silently skip
      }
    });
}
