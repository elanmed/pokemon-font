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
import {
  PRIVATE_USE_AREA_START,
  ANIMATED_FRAME_START_OFFSET,
} from "./constants";

async function resetDirectory(directoryPath: string) {
  await rm(directoryPath, { force: true, recursive: true });
  await mkdir(directoryPath);
  await writeFile(join(directoryPath, ".gitkeep"), "");
}

async function main() {
  const args = getDefaultedArgs(process.argv);
  const frameCountsByPokemon: number[] = [];

  await Promise.all([PROCESSED_ASSETS_DIR, RAW_ASSETS_DIR].map(resetDirectory));

  for (let id = 1; id <= 151; id++) {
    const idx = id - 1;
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

  if (args.animated) {
    let frameOffset = ANIMATED_FRAME_START_OFFSET;
    for (let id = 1; id <= 151; id++) {
      const animationGifPath = join(SPRITES_SOURCE_ANIMATED_DIR, `${id}.gif`);
      const animationArrayBuffer = await readFile(animationGifPath);
      const gif = await GifUtil.read(animationArrayBuffer);

      const canvasBuffers = compositeFramesCumulatively({
        frames: gif.frames,
        canvasWidth: gif.width,
        canvasHeight: gif.height,
      });

      const sharedBoundingBox = computeUnionBoundingBox(canvasBuffers);

      for (const canvasBuffer of canvasBuffers) {
        const croppedPngBuffer = cropBufferToBoundingBox(
          canvasBuffer,
          sharedBoundingBox,
        );
        const croppedPng = PNG.sync.read(croppedPngBuffer);

        const svg = pngToSvg({
          png: croppedPngBuffer,
          width: croppedPng.width,
          height: croppedPng.height,
        });
        await writeAssets({
          png: croppedPngBuffer,
          svg,
          offset: frameOffset,
        });

        frameOffset++;
      }

      frameCountsByPokemon.push(gif.frames.length);
    }

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
  const codepoint = PRIVATE_USE_AREA_START + offset;
  const codepointHex = codepoint.toString(16).padStart(4, "0");
  const basename = `emoji_u${codepointHex}`;
  await Promise.all([
    writeFile(join(PROCESSED_ASSETS_DIR, `${basename}.svg`), svg),
    writeFile(join(RAW_ASSETS_DIR, `${basename}.png`), png),
  ]);
}

type GifFrameLike = {
  bitmap: { width: number; height: number; data: Buffer };
  xOffset: number;
  yOffset: number;
  disposalMethod: number;
};

const DISPOSAL_RESTORE_TO_BACKGROUND = 2;

function compositeFramesCumulatively({
  frames,
  canvasWidth,
  canvasHeight,
}: {
  frames: GifFrameLike[];
  canvasWidth: number;
  canvasHeight: number;
}) {
  const canvas = new PNG({ width: canvasWidth, height: canvasHeight });
  const canvasBuffers: Buffer[] = [];

  for (const frame of frames) {
    const framePng = new PNG({
      width: frame.bitmap.width,
      height: frame.bitmap.height,
    });
    frame.bitmap.data.copy(framePng.data);

    compositeOpaquePixels({
      source: framePng,
      destination: canvas,
      destinationX: frame.xOffset,
      destinationY: frame.yOffset,
    });

    canvasBuffers.push(Buffer.from(PNG.sync.write(canvas)));

    if (frame.disposalMethod === DISPOSAL_RESTORE_TO_BACKGROUND) {
      clearRegion({
        canvas,
        x: frame.xOffset,
        y: frame.yOffset,
        width: frame.bitmap.width,
        height: frame.bitmap.height,
      });
    }
  }

  return canvasBuffers;
}

function compositeOpaquePixels({
  source,
  destination,
  destinationX,
  destinationY,
}: {
  source: PNG;
  destination: PNG;
  destinationX: number;
  destinationY: number;
}) {
  for (let rowIndex = 0; rowIndex < source.height; rowIndex++) {
    for (let columnIndex = 0; columnIndex < source.width; columnIndex++) {
      const sourcePixelIndex = (source.width * rowIndex + columnIndex) << 2;
      const sourceAlpha = source.data[sourcePixelIndex + 3];

      if (sourceAlpha === 0) continue;

      const destinationRow = destinationY + rowIndex;
      const destinationColumn = destinationX + columnIndex;
      const destinationPixelIndex =
        (destination.width * destinationRow + destinationColumn) << 2;

      destination.data[destinationPixelIndex] = source.data[sourcePixelIndex];
      destination.data[destinationPixelIndex + 1] =
        source.data[sourcePixelIndex + 1];
      destination.data[destinationPixelIndex + 2] =
        source.data[sourcePixelIndex + 2];
      destination.data[destinationPixelIndex + 3] = sourceAlpha;
    }
  }
}

function clearRegion({
  canvas,
  x,
  y,
  width,
  height,
}: {
  canvas: PNG;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    for (let columnIndex = 0; columnIndex < width; columnIndex++) {
      const pixelIndex =
        (canvas.width * (y + rowIndex) + (x + columnIndex)) << 2;
      canvas.data[pixelIndex + 3] = 0;
    }
  }
}

type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

function findVisibleBoundingBox(png: PNG): BoundingBox | null {
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
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function computeUnionBoundingBox(buffers: Buffer[]): BoundingBox {
  const unionBoundingBox: BoundingBox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -1,
    maxY: -1,
  };

  for (const buffer of buffers) {
    const png = PNG.sync.read(buffer);
    const frameBoundingBox = findVisibleBoundingBox(png);
    if (frameBoundingBox === null) continue;

    unionBoundingBox.minX = Math.min(
      unionBoundingBox.minX,
      frameBoundingBox.minX,
    );
    unionBoundingBox.minY = Math.min(
      unionBoundingBox.minY,
      frameBoundingBox.minY,
    );
    unionBoundingBox.maxX = Math.max(
      unionBoundingBox.maxX,
      frameBoundingBox.maxX,
    );
    unionBoundingBox.maxY = Math.max(
      unionBoundingBox.maxY,
      frameBoundingBox.maxY,
    );
  }

  return unionBoundingBox;
}

function cropToBoundingBox(png: PNG, boundingBox: BoundingBox) {
  const cropWidth = boundingBox.maxX - boundingBox.minX + 1;
  const cropHeight = boundingBox.maxY - boundingBox.minY + 1;
  const cropSquare = Math.max(cropWidth, cropHeight);

  const cropped = new PNG({
    width: cropSquare,
    height: cropSquare,
  });

  const destX = Math.floor((cropSquare - cropWidth) / 2);
  const destY = cropSquare - cropHeight;

  PNG.bitblt(
    png,
    cropped,
    boundingBox.minX,
    boundingBox.minY,
    cropWidth,
    cropHeight,
    destX,
    destY,
  );

  return Buffer.from(PNG.sync.write(cropped));
}

function cropBufferToBoundingBox(buffer: Buffer, boundingBox: BoundingBox) {
  const png = PNG.sync.read(buffer);
  return cropToBoundingBox(png, boundingBox);
}

async function cropTransparentBuffer(buffer: Buffer) {
  const png = PNG.sync.read(buffer);
  const boundingBox = findVisibleBoundingBox(png);

  if (boundingBox === null) {
    return Buffer.from(PNG.sync.write(new PNG({ width: 1, height: 1 })));
  }

  return cropToBoundingBox(png, boundingBox);
}

main();
