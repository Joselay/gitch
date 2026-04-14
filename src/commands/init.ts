import type { CAC } from "cac";
import * as out from "../ui/output.ts";

const ZSH_HOOK = `_gitego_chpwd() {
  local profile
  profile=$(gitego _resolve 2>/dev/null)
  if [[ -n "$profile" ]]; then
    echo "gitego: switched to $profile"
  fi
}
autoload -Uz add-zsh-hook
add-zsh-hook chpwd _gitego_chpwd`;

const BASH_HOOK = `_gitego_prompt() {
  if [[ "$_gitego_last_dir" == "$PWD" ]]; then return; fi
  _gitego_last_dir="$PWD"
  local profile
  profile=$(gitego _resolve 2>/dev/null)
  if [[ -n "$profile" ]]; then
    echo "gitego: switched to $profile"
  fi
}
PROMPT_COMMAND="_gitego_prompt;\${PROMPT_COMMAND}"`;

const FISH_HOOK = `function __gitego_cd --on-variable PWD
  set -l profile (gitego _resolve 2>/dev/null)
  if test -n "$profile"
    echo "gitego: switched to $profile"
  end
end`;

export function registerInit(program: CAC): void {
  program
    .command("init <shell>", "Output shell hook for auto-switching (zsh, bash, or fish)")
    .action((shell: string) => {
      switch (shell) {
        case "zsh":
          process.stdout.write(`${ZSH_HOOK}\n`);
          break;
        case "bash":
          process.stdout.write(`${BASH_HOOK}\n`);
          break;
        case "fish":
          process.stdout.write(`${FISH_HOOK}\n`);
          break;
        default:
          out.error(`Unsupported shell: "${shell}". Use "zsh", "bash", or "fish".`);
          process.exit(1);
      }
    });
}
