import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { addProfile, loadConfig, profileExists, saveConfig } from "../core/config.ts";
import { addSSHKey, currentUser, isGhInstalled } from "../core/gh.ts";
import {
  addHostAlias,
  expandPath,
  generateSSHKey,
  isValidProfileName,
  sshKeyExists,
  testSSHConnection,
} from "../core/ssh.ts";
import type { Profile } from "../types.ts";
import * as out from "../ui/output.ts";
import { promptProfile } from "../ui/prompts.ts";

interface AddOptions {
  name?: string;
  email?: string;
  sshKey?: string;
  generateKey?: boolean;
  ghUsername?: string;
  detectGh?: boolean;
  addToGithub?: boolean;
  testSsh?: boolean;
}

export function registerAdd(program: CAC): void {
  program
    .command("add <profile>", "Create a new git profile")
    .option("--name <name>", "Git user name (headless)")
    .option("--email <email>", "Git email (headless)")
    .option("--ssh-key <path>", "SSH private key path (headless)")
    .option("--generate-key", "Generate a new SSH key (headless)")
    .option("--gh-username <username>", "GitHub username (headless)")
    .option("--detect-gh", "Auto-detect GitHub username from gh CLI (headless)")
    .option("--add-to-github", "Add SSH key to GitHub via gh CLI (headless)")
    .option("--test-ssh", "Test SSH connection after setup")
    .action(async (profileName: string, options: AddOptions) => {
      if (!isValidProfileName(profileName)) {
        out.error("Profile name must be alphanumeric, hyphens, or underscores only.");
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

      if (headless && options.addToGithub) {
        if (await isGhInstalled()) {
          try {
            const pubKeyPath = `${expandPath(profile.sshKeyPath)}.pub`;
            await addSSHKey(pubKeyPath, `gitch:${profileName}`);
            out.success("SSH key added to GitHub via gh CLI.");
          } catch {
            out.warn("Failed to add SSH key to GitHub. Add it manually.");
          }
        } else {
          out.warn("GitHub CLI (gh) not installed — skipping SSH key upload.");
        }
      }

      out.success(`Profile "${profileName}" added.`);
      out.dim(`  SSH alias: github.com-${profileName}`);
      out.dim(`  Switch to it: gitch use ${profileName}`);

      if (options.testSsh) {
        out.info("Testing SSH connection...");
        const ok = await testSSHConnection(profileName);
        if (ok) {
          out.success(`SSH connection to github.com-${profileName} verified!`);
        } else {
          out.warn("SSH test did not confirm authentication. Ensure the key is added to GitHub.");
        }
      }
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

  let ghUsername = options.ghUsername;

  if (!ghUsername && options.detectGh) {
    if (await isGhInstalled()) {
      const detected = await currentUser();
      if (detected) {
        ghUsername = detected;
        out.success(`GitHub account detected: ${detected}`);
      } else {
        out.warn("Could not detect GitHub user. Run 'gh auth login' first.");
      }
    } else {
      out.warn("GitHub CLI (gh) not installed — skipping auto-detect.");
    }
  }

  return {
    name: profileName,
    gitName: name,
    gitEmail: email,
    sshKeyPath,
    ghUsername: ghUsername || undefined,
    createdAt: new Date().toISOString(),
  };
}
