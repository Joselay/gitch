import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { getProfile, loadConfig, saveConfig, updateProfile } from "../core/config.ts";
import { applyProfileLocally, setGlobalConfig } from "../core/git.ts";
import {
  addHostAlias,
  buildSSHCommand,
  expandPath,
  isValidSSHKeyPath,
  sshKeyExists,
} from "../core/ssh.ts";
import type { Profile } from "../types.ts";
import * as out from "../ui/output.ts";
import { promptEditProfile } from "../ui/prompts.ts";

interface EditOptions {
  name?: string;
  email?: string;
  sshKey?: string;
  ghUsername?: string;
  clearGh?: boolean;
}

export function registerEdit(program: CAC): void {
  program
    .command("edit <profile>", "Edit an existing profile")
    .option("--name <name>", "Git user name")
    .option("--email <email>", "Git email")
    .option("--ssh-key <path>", "SSH private key path")
    .option("--gh-username <username>", "GitHub username")
    .option("--clear-gh", "Remove GitHub username")
    .action(async (profileName: string, options: EditOptions) => {
      const config = await loadConfig();
      const profile = getProfile(config, profileName);

      if (!profile) {
        out.error(`Profile "${profileName}" not found.`);
        out.dim("  Run 'gitego list' to see available profiles.");
        process.exit(1);
      }

      const headless = !!(
        options.name ||
        options.email ||
        options.sshKey ||
        options.ghUsername ||
        options.clearGh
      );

      let updates: Partial<Omit<(typeof config.profiles)[string], "name" | "createdAt">> | null;

      if (headless) {
        updates = await buildUpdatesHeadless(options);
      } else {
        updates = await promptEditProfile(profile);
      }

      if (!updates) return;

      await createBackup();

      const updated = updateProfile(config, profileName, updates);
      await saveConfig(updated);

      if (updates.sshKeyPath) {
        await addHostAlias(profileName, updates.sshKeyPath);
      }

      if (config.activeProfile === profileName) {
        if (updates.gitName) await setGlobalConfig("user.name", updates.gitName);
        if (updates.gitEmail) await setGlobalConfig("user.email", updates.gitEmail);
      }

      const updatedProfile = getProfile(updated, profileName);
      if (updatedProfile && (updates.gitName || updates.gitEmail || updates.sshKeyPath)) {
        const sshCmd = buildSSHCommand(updatedProfile.sshKeyPath);
        for (const binding of config.bindings) {
          if (binding.profile === profileName) {
            try {
              await applyProfileLocally(
                updatedProfile.gitName,
                updatedProfile.gitEmail,
                sshCmd,
                binding.path,
              );
            } catch {
              out.warn(`Could not update local config at "${binding.path}".`);
            }
          }
        }
      }

      out.success(`Profile "${profileName}" updated.`);
      for (const [key, value] of Object.entries(updates)) {
        out.label(`  ${key}`, String(value ?? "(cleared)"));
      }
    });
}

async function buildUpdatesHeadless(
  options: EditOptions,
): Promise<Partial<Omit<Profile, "name" | "createdAt">> | null> {
  const updates: Partial<Omit<Profile, "name" | "createdAt">> = {};
  let hasChanges = false;

  if (options.name) {
    updates.gitName = options.name;
    hasChanges = true;
  }

  if (options.email) {
    if (!options.email.includes("@")) {
      out.error("Invalid email address.");
      return null;
    }
    updates.gitEmail = options.email;
    hasChanges = true;
  }

  if (options.sshKey) {
    if (!isValidSSHKeyPath(options.sshKey)) {
      out.error("SSH key path contains invalid characters.");
      return null;
    }
    const expanded = expandPath(options.sshKey);
    if (!(await sshKeyExists(expanded))) {
      out.error(`SSH key not found: ${expanded}`);
      return null;
    }
    updates.sshKeyPath = options.sshKey;
    hasChanges = true;
  }

  if (options.clearGh) {
    updates.ghUsername = undefined;
    hasChanges = true;
  } else if (options.ghUsername) {
    updates.ghUsername = options.ghUsername;
    hasChanges = true;
  }

  if (!hasChanges) {
    out.info("No changes specified.");
    return null;
  }

  return updates;
}
