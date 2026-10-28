#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
CHEON_RUNTIME="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
if [[ -x "$CHEON_RUNTIME/node" ]]; then
  export PATH="$CHEON_RUNTIME:$PATH"
fi
pnpm dev
