import { GifUtil } from "gifwrap";
import { PNG } from "pngjs";
import { join } from "node:path";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import {
  PROCESSED_ASSETS_DIR,
  RAW_ASSETS_DIR,
  FRAME_COUNTS_PATH,
  SPRITES_SOURCE_STATIC_DIR,
  SPRITES_SOURCE_ANIMATED_DIR,
} from "./paths";
import { getDefaultedArgs } from "./args-parse";

const privateUseAreaStart = 0x100000;

async function resetDirectory(directoryPath: string) {
  await rm(directoryPath, { force: true, recursive: true });
  await mkdir(directoryPath);
  await writeFile(join(directoryPath, ".gitkeep"), "");
}

async function main() {
  const args = getDefaultedArgs(process.argv);
  const frameCountsByPokemon: number[] = [];

  await Promise.all([PROCESSED_ASSETS_DIR, RAW_ASSETS_DIR].map(resetDirectory));

  let frameOffset = 0;
  for (let id = 1; id <= 151; id++) {
    const idx = id - 1;
    if (args.animated) {
      const animationGifPath = join(SPRITES_SOURCE_ANIMATED_DIR, `${id}.gif`);
      const animationArrayBuffer = await readFile(animationGifPath);
      const gif = await GifUtil.read(animationArrayBuffer);

      for (const frame of gif.frames) {
        frameCountsByPokemon.push(gif.frames.length);

        const framePng = new PNG({
          width: frame.bitmap.width,
          height: frame.bitmap.height,
        });
        frame.bitmap.data.copy(framePng.data);
        const framePngBuffer = Buffer.from(PNG.sync.write(framePng));
        // const croppedPngBuffer = await cropTransparentBuffer(framePngBuffer);

        const svg = pngToSvg({
          png: framePngBuffer,
          width: frame.bitmap.width,
          height: frame.bitmap.height,
        });
        await writeAssets({
          png: framePngBuffer,
          svg,
          offset: frameOffset,
        });
        frameOffset++;
      }
    } else {
      const pngPath = join(SPRITES_SOURCE_STATIC_DIR, `${id}.png`);
      const pngBuffer = await readFile(pngPath);
      const croppedPngBuffer = await cropTransparentBuffer(pngBuffer);

      const png = PNG.sync.read(croppedPngBuffer);
      const svg = pngToSvg({
        png: croppedPngBuffer,
        width: png.width,
        height: png.height,
      });
      await writeAssets({ png: pngBuffer, svg, offset: idx });
    }
  }

  if (args.animated) {
    await writeFile(FRAME_COUNTS_PATH, JSON.stringify(frameCountsByPokemon));
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
  png: Buffer;
}) {
  const codepoint = privateUseAreaStart + offset;
  const codepointHex = codepoint.toString(16).padStart(4, "0");
  const basename = `emoji_u${codepointHex}`;
  await Promise.all([
    writeFile(join(PROCESSED_ASSETS_DIR, `${basename}.svg`), svg),
    writeFile(join(RAW_ASSETS_DIR, `${basename}.png`), png),
  ]);
}

async function cropTransparentBuffer(buffer: Buffer) {
  const png = PNG.sync.read(buffer);

  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const alpha = png.data[idx + 3];

      if (alpha !== 0) {
        minX = Math.min(x, minX);
        minY = Math.min(y, minY);
        maxX = Math.max(x, maxX);
        maxY = Math.max(y, maxY);
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return Buffer.from(PNG.sync.write(new PNG({ width: 1, height: 1 })));
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropSquare = Math.max(cropWidth, cropHeight);

  const cropped = new PNG({
    width: cropSquare,
    height: cropSquare,
  });

  const destX = Math.floor((cropSquare - cropWidth) / 2);
  const destY = cropSquare - cropHeight;

  PNG.bitblt(png, cropped, minX, minY, cropWidth, cropHeight, destX, destY);

  return Buffer.from(PNG.sync.write(cropped));
}

main();
