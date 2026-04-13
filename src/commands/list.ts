import type { Command } from "commander";
import { loadConfig, getProfileNames } from "../core/config.ts";
import pc from "picocolors";
import * as out from "../ui/output.ts";

export function registerList(program: Command): void {
  program
    .command("list")
    .description("List all profile names")
    .action(async () => {
      const config = await loadConfig();
      const names = getProfileNames(config);

      if (names.length === 0) {
        out.info("No profiles configured.");
        out.dim("  Run 'gitch add <profile>' to create one.");
        return;
      }

      for (const name of names) {
        const isActive = config.activeProfile === name;
        const marker = isActive ? pc.green("● ") : "  ";
        const label = isActive ? pc.green(pc.bold(name)) : name;
        process.stdout.write(`${marker}${label}\n`);
      }
    });
}
