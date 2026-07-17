import { writeFileSync } from "node:fs";
import { GifUtil } from "gifwrap";
import { PNG } from "pngjs";
import { join } from "node:path";
import { PROCESSED_ASSETS_DIR, RAW_ASSETS_DIR } from "./paths";
import { getDefaultedArgs } from "./args-parse";
import { writeFile } from "node:fs/promises";

const privateUseAreaStart = 0x100000;

async function main() {
  const args = getDefaultedArgs(process.argv);

  let frameOffset = 0;
  for (let id = 1; id <= 151; id++) {
    const idx = id - 1;
    if (args.animated) {
      const animationUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;

      const animationRes = await fetch(animationUrl);
      const animationBlob = await animationRes.blob();
      const animationArrayBuffer = Buffer.from(
        await animationBlob.arrayBuffer(),
      );
      const gif = await GifUtil.read(animationArrayBuffer);

      for (const frame of gif.frames) {
        const framePng = new PNG({
          width: frame.bitmap.width,
          height: frame.bitmap.height,
        });
        frame.bitmap.data.copy(framePng.data);
        const framePngBuffer = Buffer.from(PNG.sync.write(framePng));
        const svg = pngToSvg({
          png: framePngBuffer,
          width: frame.bitmap.width,
          height: frame.bitmap.height,
        });
        await writeAssets({
          png: framePngBuffer.toString(),
          svg,
          offset: frameOffset,
        });
        frameOffset++;
      }
    } else {
      const pngUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
      const pngRes = await fetch(pngUrl);
      const pngBlob = await pngRes.blob();
      const pngArrayBuffer = await pngBlob.arrayBuffer();
      const pngBuffer = Buffer.from(pngArrayBuffer);
      const png = PNG.sync.read(pngBuffer);
      const svg = pngToSvg({
        png: pngBuffer,
        width: png.width,
        height: png.height,
      });
      await writeAssets({ png: pngBuffer.toString(), svg, offset: idx });
    }
  }
}

function pngToSvg({
  png,
  width,
  height,
}: {
  png: Buffer<ArrayBuffer>;
  width: number;
  height: number;
}) {
  const framePngBase64 = png.toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="data:image/png;base64,${framePngBase64}"/>
</svg>`;
}

async function writeAssets({
  offset,
  svg,
  png,
}: {
  offset: number;
  svg: string;
  png: string;
}) {
  const codepoint = privateUseAreaStart + offset;
  const codepointHex = codepoint.toString(16).padStart(4, "0");
  const basename = `emoji_u${codepointHex}`;
  await Promise.all([
    writeFile(join(PROCESSED_ASSETS_DIR, `${basename}.svg`), svg),
    writeFile(join(RAW_ASSETS_DIR, `${basename}.png`), png),
  ]);
}

main();
