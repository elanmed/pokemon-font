import { writeFileSync } from "node:fs";
import { GifUtil } from "gifwrap";
import { PNG } from "pngjs";
import { join } from "node:path";
import assert from "node:assert";

async function main() {
  const args = process.argv.slice(2);
  assert(args[0]);

  const res = await fetch(
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/142.gif",
  );
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  writeFileSync("aerodactyl.gif", Buffer.from(arrayBuffer));
  const gif = await GifUtil.read("aerodactyl.gif");
  const privateUseAreaStart = 0x100000;

  for (const [frameIndex, frame] of gif.frames.entries()) {
    const codepoint = privateUseAreaStart + frameIndex;
    const codepointHex = codepoint.toString(16).padStart(4, "0");
    const framePng = new PNG({
      width: frame.bitmap.width,
      height: frame.bitmap.height,
    });
    frame.bitmap.data.copy(framePng.data);
    const framePngBuffer = PNG.sync.write(framePng);
    const framePngBase64 = framePngBuffer.toString("base64");
    const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.bitmap.width}" height="${frame.bitmap.height}" viewBox="0 0 ${frame.bitmap.width} ${frame.bitmap.height}"><image width="${frame.bitmap.width}" height="${frame.bitmap.height}" href="data:image/png;base64,${framePngBase64}"/></svg>`;
    writeFileSync(join("svgs", `emoji_u${codepointHex}.svg`), frameSvg);
  }
}

main();
