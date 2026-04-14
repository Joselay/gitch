import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { getProfile, loadConfig, profileExists, saveConfig } from "../core/config.ts";
import { clearUrlRewrites, setUrlRewrite } from "../core/git.ts";
import { addHostAlias, isValidProfileName, removeHostAlias } from "../core/ssh.ts";
import type { EgoConfig } from "../types.ts";
import * as out from "../ui/output.ts";

function renameProfileInConfig(config: EgoConfig, oldName: string, newName: string): EgoConfig {
  const oldProfile = config.profiles[oldName];
  if (!oldProfile) return config;

  const { [oldName]: _, ...rest } = config.profiles;

  return {
    ...config,
    profiles: {
      ...rest,
      [newName]: { ...oldProfile, name: newName },
    },
    activeProfile: config.activeProfile === oldName ? newName : config.activeProfile,
    bindings: config.bindings.map((b) => (b.profile === oldName ? { ...b, profile: newName } : b)),
  };
}

export function registerRename(program: CAC): void {
  program
    .command("rename <old> <new>", "Rename a profile")
    .action(async (oldName: string, newName: string) => {
      if (!isValidProfileName(newName)) {
        out.error("New profile name must be alphanumeric, hyphens, or underscores only.");
        process.exit(1);
      }

      const config = await loadConfig();

      if (!getProfile(config, oldName)) {
        out.error(`Profile "${oldName}" not found.`);
        out.dim("  Run 'gitego list' to see available profiles.");
        process.exit(1);
      }

      if (profileExists(config, newName)) {
        out.error(`Profile "${newName}" already exists.`);
        process.exit(1);
      }

      await createBackup();

      const profile = getProfile(config, oldName);
      if (!profile) return;

      // Update SSH config: remove old host alias, add new one
      await removeHostAlias(oldName);
      await addHostAlias(newName, profile.sshKeyPath);

      // Update URL rewrites if this was the active profile
      if (config.activeProfile === oldName) {
        await clearUrlRewrites();
        await setUrlRewrite(newName);
      }

      const updated = renameProfileInConfig(config, oldName, newName);
      await saveConfig(updated);

      out.success(`Renamed "${oldName}" → "${newName}".`);
    });
}
