import { describe, expect, test } from "bun:test";
import { extractDirName, resolveRepoUrl } from "../src/commands/clone.ts";

describe("resolveRepoUrl", () => {
  test("expands owner/repo shorthand", () => {
    expect(resolveRepoUrl("user/repo", "work")).toBe("git@github.com-work:user/repo.git");
  });

  test("expands owner/repo with dots and hyphens", () => {
    expect(resolveRepoUrl("my-org/my.repo", "personal")).toBe(
      "git@github.com-personal:my-org/my.repo.git",
    );
  });

  test("rewrites git@github.com SSH URL", () => {
    expect(resolveRepoUrl("git@github.com:user/repo.git", "work")).toBe(
      "git@github.com-work:user/repo.git",
    );
  });

  test("rewrites HTTPS URL to SSH", () => {
    expect(resolveRepoUrl("https://github.com/user/repo", "work")).toBe(
      "git@github.com-work:user/repo.git",
    );
  });

  test("rewrites HTTPS URL with .git suffix", () => {
    expect(resolveRepoUrl("https://github.com/user/repo.git", "work")).toBe(
      "git@github.com-work:user/repo.git",
    );
  });

  test("passes through non-GitHub URLs unchanged", () => {
    const url = "git@gitlab.com:user/repo.git";
    expect(resolveRepoUrl(url, "work")).toBe(url);
  });

  test("passes through custom SSH URLs unchanged", () => {
    const url = "ssh://git@example.com/repo.git";
    expect(resolveRepoUrl(url, "work")).toBe(url);
  });
});

describe("extractDirName", () => {
  test("uses custom dir when provided", () => {
    expect(extractDirName("git@github.com-work:user/repo.git", "my-dir")).toBe("my-dir");
  });

  test("extracts repo name from SSH URL", () => {
    expect(extractDirName("git@github.com-work:user/repo.git")).toBe("repo");
  });

  test("extracts repo name from HTTPS URL", () => {
    expect(extractDirName("https://github.com/user/repo.git")).toBe("repo");
  });

  test("handles URL without .git suffix", () => {
    expect(extractDirName("https://github.com/user/repo")).toBe("repo");
  });

  test("extracts from shorthand-expanded URL", () => {
    expect(extractDirName("git@github.com-personal:org/my-project.git")).toBe("my-project");
  });
});
