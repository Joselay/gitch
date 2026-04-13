import { basename } from "node:path";
import type { CAC } from "cac";
import { loadConfig } from "../core/config.ts";
import * as out from "../ui/output.ts";

export function registerStatus(program: CAC): void {
  program.command("status", "Show all profiles and current status").action(async () => {
    const config = await loadConfig();
    const profiles = Object.entries(config.profiles);

    if (profiles.length === 0) {
      out.emptyProfiles();
      return;
    }

    out.heading("Profiles\n");

    for (const [name, profile] of profiles) {
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
