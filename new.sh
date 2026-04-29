#!/usr/bin/env bash
# Initialize a new game/eval folder with GAME_DEV.md and tools/ copied from this repo root.
# Usage: ./new.sh foo-bar

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAME="${1:-}"

usage() {
  echo "Usage: $0 <folder-name>" >&2
  echo "  Creates <folder-name>/ next to this script and copies tools/ and GAME_DEV.md into it." >&2
}

if [[ -z "$NAME" ]] || [[ "${NAME:0:1}" == "-" ]]; then
  usage
  exit 1
fi

if [[ "$NAME" == *"/"* ]] || [[ "$NAME" == *".."* ]]; then
  echo "Invalid folder name (no path separators): $NAME" >&2
  exit 1
fi

DEST="$ROOT/$NAME"

if [[ -e "$DEST" ]]; then
  echo "Already exists: $DEST" >&2
  exit 1
fi

mkdir -p "$DEST"
cp -R "$ROOT/tools" "$DEST/tools"
cp "$ROOT/GAME_DEV.md" "$DEST/GAME_DEV.md"

echo "Created $DEST"
echo "  GAME_DEV.md"
echo "  tools/"
