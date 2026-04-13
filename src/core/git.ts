export async function getGlobalConfig(key: string): Promise<string | null> {
  try {
    const result = await Bun.$`git config --global ${key}`.quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function setGlobalConfig(
  key: string,
  value: string,
): Promise<void> {
  await Bun.$`git config --global ${key} ${value}`.quiet();
}

export async function getLocalConfig(
  key: string,
  cwd?: string,
): Promise<string | null> {
  try {
    const cmd = Bun.$`git config --local ${key}`.quiet();
    const result = cwd ? await cmd.cwd(cwd) : await cmd;
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function setLocalConfig(
  key: string,
  value: string,
  cwd?: string,
): Promise<void> {
  const cmd = Bun.$`git config --local ${key} ${value}`.quiet();
  cwd ? await cmd.cwd(cwd) : await cmd;
}

export async function setUrlRewrite(
  profileName: string,
): Promise<void> {
  const key = `url.git@github.com-${profileName}:.insteadOf`;
  await Bun.$`git config --global ${key} git@github.com:`.quiet();
}

export async function clearUrlRewrites(): Promise<void> {
  try {
    const result =
      await Bun.$`git config --global --get-regexp ^url\\.git@github\\.com-`.quiet();
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

export async function unsetLocalConfig(
  key: string,
  cwd?: string,
): Promise<void> {
  try {
    const cmd = Bun.$`git config --local --unset ${key}`.quiet();
    cwd ? await cmd.cwd(cwd) : await cmd;
  } catch {
    // config key may already be unset, that's fine
  }
}
