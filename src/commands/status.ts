import type { CAC } from "cac";
import { loadConfig, getProfileNames, getProfile } from "../core/config.ts";
import * as out from "../ui/output.ts";
import { basename } from "node:path";

export function registerStatus(program: CAC): void {
  program
    .command("status", "Show all profiles and current status")
    .action(async () => {
      const config = await loadConfig();
      const names = getProfileNames(config);

      if (names.length === 0) {
        out.info("No profiles configured.");
        out.dim("  Run 'gitch add <profile>' to create one.");
        return;
      }

      out.heading("Profiles\n");

      for (const name of names) {
        const profile = getProfile(config, name);
        if (!profile) continue;
        const isActive = config.activeProfile === name;

        out.profileCard(
          name,
          `${profile.gitName} <${profile.gitEmail}>`,
          basename(profile.sshKeyPath),
          profile.ghUsername,
          isActive,
        );
        process.stdout.write("\n");
      }

      if (config.bindings.length > 0) {
        out.heading("Directory Bindings\n");
        for (const binding of config.bindings) {
          out.label(binding.path, binding.profile);
        }
      }
    });
}
