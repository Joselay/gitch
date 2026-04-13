export async function getGlobalConfig(key: string): Promise<string | null> {
  try {
    const result = await Bun.$`git config --global ${key}`.quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function setGlobalConfig(key: string, value: string): Promise<void> {
  await Bun.$`git config --global ${key} ${value}`.quiet();
}

export async function unsetGlobalConfig(key: string): Promise<void> {
  try {
    await Bun.$`git config --global --unset ${key}`.quiet();
  } catch {
    // config key may already be unset, that's fine
  }
}

export async function getLocalConfig(key: string, cwd?: string): Promise<string | null> {
  try {
    const base = Bun.$`git config --local ${key}`;
    const result = await (cwd ? base.cwd(cwd) : base).quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function setLocalConfig(key: string, value: string, cwd?: string): Promise<void> {
  const base = Bun.$`git config --local ${key} ${value}`;
  await (cwd ? base.cwd(cwd) : base).quiet();
}

export async function setUrlRewrite(profileName: string): Promise<void> {
  const key = `url.git@github.com-${profileName}:.insteadOf`;
  await Bun.$`git config --global ${key} git@github.com:`.quiet();
}

export async function clearUrlRewrites(): Promise<void> {
  try {
    const result = await Bun.$`git config --global --get-regexp ^url\\.git@github\\.com-`.quiet();
    const lines = result.text().trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const key = line.split(" ")[0];
      if (key) {
        await Bun.$`git config --global --unset ${key}`.quiet();
      }
    }
  } catch {
    // no existing rewrites, that's fine
  }
}

export async function unsetLocalConfig(key: string, cwd?: string): Promise<void> {
  try {
    const base = Bun.$`git config --local --unset ${key}`;
    await (cwd ? base.cwd(cwd) : base).quiet();
  } catch {
    // config key may already be unset, that's fine
  }
}

export async function applyProfileLocally(
  gitName: string,
  gitEmail: string,
  sshCommand: string,
  cwd?: string,
): Promise<void> {
  await setLocalConfig("user.name", gitName, cwd);
  await setLocalConfig("user.email", gitEmail, cwd);
  await setLocalConfig("core.sshCommand", sshCommand, cwd);
}

export async function clearProfileLocally(cwd?: string): Promise<void> {
  await unsetLocalConfig("user.name", cwd);
  await unsetLocalConfig("user.email", cwd);
  await unsetLocalConfig("core.sshCommand", cwd);
}
