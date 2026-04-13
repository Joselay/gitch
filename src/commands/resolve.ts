import type { Command } from "commander";
import { loadConfig, getProfile, getBindingForPath } from "../core/config.ts";
import { getLocalConfig, setLocalConfig } from "../core/git.ts";

export function registerResolve(program: Command): void {
  const cmd = program
    .command("_resolve", { hidden: true })
    .description("(internal) Resolve profile for current directory");
  cmd.action(async () => {
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
