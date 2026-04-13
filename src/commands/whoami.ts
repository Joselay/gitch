import { basename } from "node:path";
import type { CAC } from "cac";
import { getProfile, loadConfig } from "../core/config.ts";
import { getGlobalConfig } from "../core/git.ts";
import * as out from "../ui/output.ts";

export function registerWhoami(program: CAC): void {
  program.command("whoami", "Show the current git identity").action(async () => {
    const config = await loadConfig();

    if (config.activeProfile) {
      const profile = getProfile(config, config.activeProfile);
      if (profile) {
        out.heading(`You are ${profile.gitName} <${profile.gitEmail}>`);
        out.label("Profile", config.activeProfile);
        out.label("SSH Key", basename(profile.sshKeyPath));
        if (profile.ghUsername) {
          out.label("GitHub", profile.ghUsername);
        }
        return;
      }
    }

    const name = await getGlobalConfig("user.name");
    const email = await getGlobalConfig("user.email");

    if (name || email) {
      out.heading(`You are ${name ?? "unknown"} <${email ?? "unknown"}>`);
      out.dim("  No gitch profile active.");
    } else {
      out.warn("No git identity configured.");
      out.dim("  Run 'gitch add <profile>' to create one.");
    }
  });
}
