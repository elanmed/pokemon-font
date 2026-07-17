#!/bin/sh
set -e

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is not installed" >&2
  exit 1
fi

bun run args-assert -- "$@"
bun run venv-create
bun run venv-install
bun run font-download -- "$@"
bun run font-build -- "$@"
bun run font-copy -- "$@"
