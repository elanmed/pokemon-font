#!/usr/bin/env bash
set -euo pipefail

scriptDirectory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$scriptDirectory/nanoemoji-env/bin:$PATH"

font_family=${2:-$1}

"$scriptDirectory/nanoemoji-env/bin/nanoemoji" --color_format sbix --family "$font_family" --output_file "$font_family.ttf" "$scriptDirectory"/svgs/emoji_u*.svg
echo "$font_family.ttf written to $scriptDirectory/build"
