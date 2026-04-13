import type { CAC } from "cac";
import { loadConfig, getProfileNames } from "../core/config.ts";
import ansis from "ansis";
import * as out from "../ui/output.ts";

export function registerList(program: CAC): void {
  program
    .command("list", "List all profile names")
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
        const marker = isActive ? ansis.green("● ") : "  ";
        const label = isActive ? ansis.green.bold(name) : name;
        process.stdout.write(`${marker}${label}\n`);
      }
    });
}
