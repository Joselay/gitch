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

export async function getLocalConfig(key: string): Promise<string | null> {
  try {
    const result = await Bun.$`git config --local ${key}`.quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}

export async function setLocalConfig(
  key: string,
  value: string,
): Promise<void> {
  await Bun.$`git config --local ${key} ${value}`.quiet();
}
