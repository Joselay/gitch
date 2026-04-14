import { describe, expect, test } from "bun:test";

describe("init shell hooks", () => {
  test("zsh hook contains chpwd", async () => {
    const result = await Bun.$`bun run index.ts init zsh`.quiet();
    const output = result.text();
    expect(output).toContain("_gitego_chpwd");
    expect(output).toContain("chpwd");
    expect(output).toContain("gitego _resolve");
  });

  test("bash hook contains PROMPT_COMMAND", async () => {
    const result = await Bun.$`bun run index.ts init bash`.quiet();
    const output = result.text();
    expect(output).toContain("PROMPT_COMMAND");
    expect(output).toContain("gitego _resolve");
  });

  test("fish hook contains on-variable PWD", async () => {
    const result = await Bun.$`bun run index.ts init fish`.quiet();
    const output = result.text();
    expect(output).toContain("--on-variable PWD");
    expect(output).toContain("gitego _resolve");
  });

  test("unsupported shell exits with error", async () => {
    try {
      await Bun.$`bun run index.ts init powershell`.quiet();
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      const error = err as { exitCode: number; stderr: Buffer };
      expect(error.exitCode).not.toBe(0);
      expect(error.stderr.toString()).toContain("Unsupported shell");
    }
  });
});
