import { test, expect, describe } from "bun:test";
import { expandPath } from "../src/core/ssh.ts";
import { homedir } from "node:os";

describe("ssh", () => {
  test("expandPath expands ~ to homedir", () => {
    expect(expandPath("~/.ssh/id_ed25519")).toBe(
      `${homedir()}/.ssh/id_ed25519`,
    );
  });

  test("expandPath leaves absolute paths unchanged", () => {
    expect(expandPath("/home/user/.ssh/key")).toBe("/home/user/.ssh/key");
  });

  test("expandPath leaves relative paths unchanged", () => {
    expect(expandPath("some/path")).toBe("some/path");
  });
});
