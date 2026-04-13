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
