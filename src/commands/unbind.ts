import { resolve } from "node:path";
import type { CAC } from "cac";
import { createBackup } from "../core/backup.ts";
import { getBindingForPath, loadConfig, removeBinding, saveConfig } from "../core/config.ts";
import { unsetLocalConfig } from "../core/git.ts";
import * as out from "../ui/output.ts";

export function registerUnbind(program: CAC): void {
  program
    .command("unbind [path]", "Remove directory binding")
    .action(async (path: string | undefined) => {
      const absolutePath = resolve(path ?? ".");
      const config = await loadConfig();

      const binding = getBindingForPath(config, absolutePath);
      if (!binding) {
        out.error(`No binding found for "${absolutePath}".`);
        process.exit(1);
      }

      await createBackup();

      await unsetLocalConfig("user.name", absolutePath);
      await unsetLocalConfig("user.email", absolutePath);
      await unsetLocalConfig("core.sshCommand", absolutePath);

      const updated = removeBinding(config, absolutePath);
      await saveConfig(updated);

      out.success(`Unbound "${absolutePath}" from "${binding.profile}".`);
    });
}
