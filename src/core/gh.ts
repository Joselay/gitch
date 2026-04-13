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

export async function currentUser(): Promise<string | null> {
  try {
    const result =
      await Bun.$`gh api user --jq '.login' 2>/dev/null`.quiet();
    return result.text().trim() || null;
  } catch {
    return null;
  }
}
