import type { CAC } from "cac";
import type { Profile } from "../types.ts";
import {
  loadConfig,
  saveConfig,
  profileExists,
  addProfile,
} from "../core/config.ts";
import {
  addHostAlias,
  isValidProfileName,
  sshKeyExists,
  expandPath,
  generateSSHKey,
} from "../core/ssh.ts";
import { createBackup } from "../core/backup.ts";
import { promptProfile } from "../ui/prompts.ts";
import * as out from "../ui/output.ts";

interface AddOptions {
  name?: string;
  email?: string;
  sshKey?: string;
  generateKey?: boolean;
  ghUsername?: string;
}

export function registerAdd(program: CAC): void {
  program
    .command("add <profile>", "Create a new git profile")
    .option("--name <name>", "Git user name (headless)")
    .option("--email <email>", "Git email (headless)")
    .option("--ssh-key <path>", "SSH private key path (headless)")
    .option("--generate-key", "Generate a new SSH key (headless)")
    .option("--gh-username <username>", "GitHub username (headless)")
    .action(async (profileName: string, options: AddOptions) => {
      if (!isValidProfileName(profileName)) {
        out.error(
          "Profile name must be alphanumeric, hyphens, or underscores only.",
        );
        process.exit(1);
      }

      const config = await loadConfig();

      if (profileExists(config, profileName)) {
        out.error(`Profile "${profileName}" already exists.`);
        process.exit(1);
      }

      const headless = !!(options.name && options.email);
      let profile: Profile | null;

      if (headless) {
        profile = await buildProfileHeadless(profileName, options);
      } else {
        profile = await promptProfile(profileName);
      }

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

async function buildProfileHeadless(
  profileName: string,
  options: AddOptions,
): Promise<Profile | null> {
  const { name, email } = options;

  if (!name || !email) {
    out.error("Both --name and --email are required for headless mode.");
    return null;
  }

  if (!email.includes("@")) {
    out.error("Invalid email address.");
    return null;
  }

  let sshKeyPath: string;

  if (options.generateKey) {
    if (options.sshKey) {
      out.error("Cannot use both --ssh-key and --generate-key.");
      return null;
    }
    try {
      sshKeyPath = await generateSSHKey(email, profileName);
    } catch (err) {
      out.error(
        `Failed to generate SSH key: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      return null;
    }
  } else if (options.sshKey) {
    const expanded = expandPath(options.sshKey);
    if (!(await sshKeyExists(expanded))) {
      out.error(`SSH key not found: ${expanded}`);
      return null;
    }
    sshKeyPath = options.sshKey;
  } else {
    out.error("Either --ssh-key or --generate-key is required for headless mode.");
    return null;
  }

  return {
    name: profileName,
    gitName: name,
    gitEmail: email,
    sshKeyPath,
    ghUsername: options.ghUsername || undefined,
    createdAt: new Date().toISOString(),
  };
}
