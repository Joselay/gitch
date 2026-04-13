import cac from "cac";
import pkg from "../package.json";
import { registerAdd } from "./commands/add.ts";
import { registerBind } from "./commands/bind.ts";
import { registerInit } from "./commands/init.ts";
import { registerList } from "./commands/list.ts";
import { registerRemove } from "./commands/remove.ts";
import { registerResolve } from "./commands/resolve.ts";
import { registerStatus } from "./commands/status.ts";
import { registerUnbind } from "./commands/unbind.ts";
import { registerUse } from "./commands/use.ts";
import { registerWhoami } from "./commands/whoami.ts";
import { CancelledError } from "./types.ts";
import * as out from "./ui/output.ts";

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : "An unexpected error occurred.";
}

process.on("unhandledRejection", (err) => {
  if (err instanceof CancelledError) {
    process.exit(0);
  }
  out.error(formatError(err));
  process.exit(1);
});

const cli = cac("gitch");

registerAdd(cli);
registerUse(cli);
registerWhoami(cli);
registerStatus(cli);
registerRemove(cli);
registerList(cli);
registerBind(cli);
registerUnbind(cli);
registerInit(cli);
registerResolve(cli);

cli.help();
cli.version(pkg.version);

try {
  cli.parse();
} catch (err) {
  out.error(formatError(err));
  process.exit(1);
}
