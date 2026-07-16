#!/usr/bin/env bash
set -euo pipefail

scriptDirectory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$scriptDirectory/nanoemoji-env/bin:$PATH"

"$scriptDirectory/nanoemoji-env/bin/nanoemoji" --color_format sbix "$scriptDirectory"/svgs/emoji_u*.svg
