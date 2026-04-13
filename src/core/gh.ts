export async function isGhInstalled(): Promise<boolean> {
  try {
    await Bun.$`which gh`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function switchUser(username: string): Promise<void> {
  await Bun.$`gh auth switch --user ${username}`.quiet();
}

export async function addSSHKey(pubKeyPath: string, title: string): Promise<void> {
  await Bun.$`gh ssh-key add ${pubKeyPath} --title ${title}`.quiet();
}

export interface GhUserInfo {
  login: string;
  name: string | null;
  email: string | null;
}

export async function currentUser(): Promise<string | null> {
  try {
    const result = await Bun.$`gh api user --jq '.login'`.quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function getUserInfo(): Promise<GhUserInfo | null> {
  try {
    const result =
      await Bun.$`gh api user --jq '{login: .login, name: .name, email: .email}'`.quiet();
    const parsed: unknown = JSON.parse(result.text().trim());
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.login !== "string" || !obj.login) return null;
    return {
      login: obj.login,
      name: typeof obj.name === "string" ? obj.name : null,
      email: typeof obj.email === "string" ? obj.email : null,
    };
  } catch {
    return null;
  }
}
