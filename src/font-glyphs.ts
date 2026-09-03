import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { DIST_DIR, FRAME_COUNTS_PATH } from "./paths";
import { getDefaultedArgs } from "./args-parse";
import { PRIVATE_USE_AREA_START, TOTAL_STATIC_GLYPH_COUNT } from "./constants";

async function main() {
  const args = getDefaultedArgs(process.argv);
  const glyphCharacters: string[] = [];

  for (
    let glyphIndex = 0;
    glyphIndex < TOTAL_STATIC_GLYPH_COUNT;
    glyphIndex++
  ) {
    glyphCharacters.push(
      String.fromCodePoint(PRIVATE_USE_AREA_START + glyphIndex),
    );
  }

  if (args.animated) {
    const frameCounts: number[] = JSON.parse(
      await readFile(FRAME_COUNTS_PATH, "utf8"),
    );
    let frameOffset = TOTAL_STATIC_GLYPH_COUNT;
    for (const frameCount of frameCounts) {
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        glyphCharacters.push(
          String.fromCodePoint(
            PRIVATE_USE_AREA_START + frameOffset + frameIndex,
          ),
        );
      }
      frameOffset += frameCount;
    }
  }

  const outputPath = join(DIST_DIR, "glyphs.txt");
  await writeFile(outputPath, glyphCharacters.join("\n"));
  console.log(`Wrote ${glyphCharacters.length} glyphs to ${outputPath}`);
}

main();
