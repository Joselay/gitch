import * as p from "@clack/prompts";
import { sshKeyExists, expandPath } from "../core/ssh.ts";
import type { Profile } from "../types.ts";

export async function promptProfile(name: string): Promise<Profile | null> {
  p.intro(`Creating profile: ${name}`);

  const values = await p.group(
    {
      gitName: () =>
        p.text({
          message: "Git user name",
          placeholder: "John Doe",
          validate: (v) => {
            if (!v?.trim()) return "Name is required";
          },
        }),
      gitEmail: () =>
        p.text({
          message: "Git email",
          placeholder: "john@example.com",
          validate: (v) => {
            if (!v?.trim()) return "Email is required";
            if (!v.includes("@")) return "Invalid email";
          },
        }),
      sshKeyPath: () =>
        p.text({
          message: "SSH private key path",
          placeholder: "~/.ssh/id_ed25519",
          validate: (v) => {
            if (!v?.trim()) return "SSH key path is required";
          },
        }),
      ghUsername: () =>
        p.text({
          message: "GitHub username (optional)",
          placeholder: "johndoe",
        }),
    },
    {
      onCancel: () => {
        p.cancel("Profile creation cancelled.");
        return process.exit(0);
      },
    },
  );

  const keyPath = expandPath(values.sshKeyPath);
  if (!(await sshKeyExists(keyPath))) {
    p.cancel(`SSH key not found: ${keyPath}`);
    return null;
  }

  p.outro("Profile created!");

  return {
    name,
    gitName: values.gitName,
    gitEmail: values.gitEmail,
    sshKeyPath: values.sshKeyPath,
    ghUsername: values.ghUsername || undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) return false;
  return result;
}
