import type { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  profileExists,
  addProfile,
} from "../core/config.ts";
import { addHostAlias } from "../core/ssh.ts";
import { createBackup } from "../core/backup.ts";
import { promptProfile } from "../ui/prompts.ts";
import * as out from "../ui/output.ts";

export function registerAdd(program: Command): void {
  program
    .command("add <profile>")
    .description("Create a new git profile")
    .action(async (profileName: string) => {
      const config = await loadConfig();

      if (profileExists(config, profileName)) {
        out.error(`Profile "${profileName}" already exists.`);
        process.exit(1);
      }

      const profile = await promptProfile(profileName);
      if (!profile) {
        process.exit(1);
      }

      await createBackup();
      const updated = addProfile(config, profile);
      await saveConfig(updated);
      await addHostAlias(profileName, profile.sshKeyPath);

      out.success(`Profile "${profileName}" added.`);
      out.dim(`  SSH alias: github.com-${profileName}`);
      out.dim(`  Switch to it: gitch use ${profileName}`);
    });
}
