import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { dim, error, heading, info, label, success, warn } from "../src/ui/output.ts";

let stdoutChunks: string[];
let stderrChunks: string[];
let origStdoutWrite: typeof process.stdout.write;
let origStderrWrite: typeof process.stderr.write;

beforeEach(() => {
  stdoutChunks = [];
  stderrChunks = [];
  origStdoutWrite = process.stdout.write;
  origStderrWrite = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    stdoutChunks.push(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    stderrChunks.push(chunk);
    return true;
  }) as typeof process.stderr.write;
});

afterEach(() => {
  process.stdout.write = origStdoutWrite;
  process.stderr.write = origStderrWrite;
});

describe("output", () => {
  test("success writes to stdout with checkmark", () => {
    success("done");
    expect(stdoutChunks.length).toBe(1);
    expect(stdoutChunks[0]).toContain("✓");
    expect(stdoutChunks[0]).toContain("done");
  });

  test("error writes to stderr with cross", () => {
    error("failed");
    expect(stderrChunks.length).toBe(1);
    expect(stderrChunks[0]).toContain("✗");
    expect(stderrChunks[0]).toContain("failed");
  });

  test("warn writes to stderr with warning symbol", () => {
    warn("careful");
    expect(stderrChunks.length).toBe(1);
    expect(stderrChunks[0]).toContain("⚠");
    expect(stderrChunks[0]).toContain("careful");
  });

  test("info writes to stdout", () => {
    info("note");
    expect(stdoutChunks.length).toBe(1);
    expect(stdoutChunks[0]).toContain("note");
  });

  test("dim writes to stdout", () => {
    dim("faded");
    expect(stdoutChunks.length).toBe(1);
    expect(stdoutChunks[0]).toContain("faded");
  });

  test("label writes key-value to stdout", () => {
    label("Name", "Alice");
    expect(stdoutChunks.length).toBe(1);
    expect(stdoutChunks[0]).toContain("Name");
    expect(stdoutChunks[0]).toContain("Alice");
  });

  test("heading writes bold text to stdout", () => {
    heading("Title");
    expect(stdoutChunks.length).toBe(1);
    expect(stdoutChunks[0]).toContain("Title");
  });
});
