import type { CAC } from "cac";
import * as out from "../ui/output.ts";

const ZSH_HOOK = `_gitch_chpwd() {
  local profile
  profile=$(gitch _resolve 2>/dev/null)
  if [[ -n "$profile" ]]; then
    echo "gitch: switched to $profile"
  fi
}
autoload -Uz add-zsh-hook
add-zsh-hook chpwd _gitch_chpwd`;

const BASH_HOOK = `_gitch_prompt() {
  if [[ "$_gitch_last_dir" == "$PWD" ]]; then return; fi
  _gitch_last_dir="$PWD"
  local profile
  profile=$(gitch _resolve 2>/dev/null)
  if [[ -n "$profile" ]]; then
    echo "gitch: switched to $profile"
  fi
}
PROMPT_COMMAND="_gitch_prompt;\${PROMPT_COMMAND}"`;

export function registerInit(program: CAC): void {
  program
    .command("init <shell>", "Output shell hook for auto-switching (zsh or bash)")
    .action((shell: string) => {
      switch (shell) {
        case "zsh":
          process.stdout.write(`${ZSH_HOOK}\n`);
          break;
        case "bash":
          process.stdout.write(`${BASH_HOOK}\n`);
          break;
        default:
          out.error(`Unsupported shell: "${shell}". Use "zsh" or "bash".`);
          process.exit(1);
      }
    });
}
