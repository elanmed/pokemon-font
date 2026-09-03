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

// Wipes and recreates a directory, then drops a .gitkeep so git tracks the
// (otherwise empty) folder. Used to reset processed-assets/ and raw-assets/
// before each build so stale files from a previous run never leak through.
async function resetDirectory(directoryPath: string) {
  await rm(directoryPath, { force: true, recursive: true });
  await mkdir(directoryPath);
  await writeFile(join(directoryPath, ".gitkeep"), "");
}

async function main() {
  const args = getDefaultedArgs(process.argv);

  // frameCountsByPokemon[i] will hold how many animation frames Pokemon i
  // has. The preview page uses this to know where one Pokemon's frames end
  // and the next one's begin, since frame counts vary per Pokemon.
  const frameCountsByPokemon: number[] = [];

  await Promise.all([PROCESSED_ASSETS_DIR, RAW_ASSETS_DIR].map(resetDirectory));

  // --- STATIC GLYPHS (always generated) ---
  // Codepoints 0..150 (relative to PRIVATE_USE_AREA_START) are always the
  // static sprite for each Pokemon, regardless of whether --animated is set.
  for (let id = 1; id <= 151; id++) {
    const idx = id - 1;
    const pngPath = join(SPRITES_SOURCE_STATIC_DIR, `${id}.png`);
    const pngBuffer = await readFile(pngPath);

    // Static sprites often have transparent padding around the actual
    // artwork. Cropping to the visible pixels means the glyph isn't tiny
    // inside a mostly-empty box when rendered in the font.
    const croppedPngBuffer = await cropTransparentBuffer(pngBuffer);

    const png = PNG.sync.read(croppedPngBuffer);
    const svg = pngToSvg({
      png: croppedPngBuffer,
      width: png.width,
      height: png.height,
    });
    await writeAssets({ png: pngBuffer, svg, offset: idx });
  }

  // --- ANIMATED FRAMES (only when --animated is passed) ---
  // These are appended *after* all 151 static glyphs, starting at
  // ANIMATED_FRAME_START_OFFSET (== 151), so the codepoint space looks like:
  // [0..150] static glyphs, [151..] animation frames for Pokemon 1, then
  // Pokemon 2, etc.
  if (args.animated) {
    let frameOffset = ANIMATED_FRAME_START_OFFSET;

    for (let id = 1; id <= 151; id++) {
      const animationGifPath = join(SPRITES_SOURCE_ANIMATED_DIR, `${id}.gif`);
      const animationArrayBuffer = await readFile(animationGifPath);
      const gif = await GifUtil.read(animationArrayBuffer);

      // GIF frames are frequently *partial*: a frame's bitmap only covers
      // the region of the canvas that changed since the last frame, and its
      // xOffset/yOffset say where that region sits on the full canvas. If we
      // naively converted each frame's bitmap straight to an SVG, frames
      // would have different sizes (jitter) and would be missing content
      // that didn't change (flashing/blanking). compositeFramesCumulatively
      // solves both: it draws every frame onto one shared, full-size canvas
      // that persists across frames, and returns a full-canvas-sized PNG
      // buffer per frame.
      const canvasBuffers = compositeFramesCumulatively({
        frames: gif.frames,
        canvasWidth: gif.width,
        canvasHeight: gif.height,
      });

      // Even after compositing onto the full canvas, that canvas is often
      // much bigger than the actual sprite (mostly transparent padding).
      // If we cropped each frame to its *own* visible bounding box, frames
      // would end up different sizes again (the jitter problem would come
      // right back). So instead we compute ONE bounding box that covers the
      // visible pixels across ALL frames for this Pokemon, and crop every
      // frame to that same shared box. Same box => same output size => no
      // jitter.

      for (const canvasBuffer of canvasBuffers) {
        const canvasPng = PNG.sync.read(canvasBuffer);
        const croppedPng = Buffer.from(PNG.sync.write(canvasPng));

        const svg = pngToSvg({
          png: croppedPng,
          width: canvasPng.width,
          height: canvasPng.height,
        });
        await writeAssets({
          png: croppedPng,
          svg,
          offset: frameOffset,
        });

        frameOffset++;
      }

      // Record how many frames this Pokemon had, so the preview page can
      // figure out which codepoint range belongs to which Pokemon.
      frameCountsByPokemon.push(gif.frames.length);
    }

    await writeFile(FRAME_COUNTS_PATH, JSON.stringify(frameCountsByPokemon));
  }
}

// Wraps a raw PNG buffer in a minimal SVG that just displays that PNG as an
// embedded base64 image. nanoemoji (the font-building tool) wants SVG input
// per glyph, not raw PNGs, so this is just a thin wrapper format.
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

// Writes both the SVG (used by nanoemoji to build the font) and the raw PNG
// (kept around for debugging/inspection) for a single glyph, named after its
// Unicode codepoint the way nanoemoji expects (emoji_u<hex codepoint>).
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

// Minimal shape of a gifwrap GifFrame that we actually use. Kept narrow
// on purpose so this file doesn't depend on gifwrap's full internal type.
type GifFrameLike = {
  bitmap: { width: number; height: number; data: Buffer };
  xOffset: number;
  yOffset: number;
  disposalMethod: number;
};

// GIF disposal methods describe what should happen to the canvas after a
// frame is shown, before the next frame is drawn. The values we care about:
//   0 or 1 = "do not dispose" -> leave the canvas as-is, next frame draws
//            on top of it (this is the common case for these sprites).
//   2      = "restore to background" -> after this frame is shown, clear
//            just the area *this frame* drew, back to transparent, before
//            the next frame is composited.
//   3      = "restore to previous" -> revert to whatever the canvas looked
//            like before this frame was drawn. We don't currently implement
//            this one; if you see visual glitches on frames that use
//            disposalMethod 3, that's the likely cause.
const DISPOSAL_RESTORE_TO_BACKGROUND = 2;

// Renders every frame of a GIF onto one persistent, full-size canvas and
// returns one full-canvas PNG buffer per frame (in order). This is the core
// fix for both the "jitter" (different frame sizes) and "flashing"
// (frames appearing to blank out) problems:
//   - Same canvas size every frame => no jitter.
//   - Canvas persists across frames (we don't start from blank each time)
//     and drawing skips fully-transparent source pixels => a frame that
//     only updates part of the sprite doesn't erase the rest => no
//     flashing.
function compositeFramesCumulatively({
  frames,
  canvasWidth,
  canvasHeight,
}: {
  frames: GifFrameLike[];
  canvasWidth: number;
  canvasHeight: number;
}) {
  // One canvas, reused (mutated) across every frame in this loop. This is
  // the "persistent" part: unlike a version that creates a fresh blank
  // canvas per frame, this keeps whatever was drawn by earlier frames.
  const canvas = new PNG({ width: canvasWidth, height: canvasHeight });
  const canvasBuffers: Buffer[] = [];

  for (const frame of frames) {
    // Copy this frame's raw bitmap bytes into a PNG we can composite from.
    const framePng = new PNG({
      width: frame.bitmap.width,
      height: frame.bitmap.height,
    });
    frame.bitmap.data.copy(framePng.data);

    // Draw the frame onto the shared canvas at its declared offset,
    // skipping transparent pixels (see compositeOpaquePixels below) so we
    // don't blank out content from previous frames.
    compositeOpaquePixels({
      source: framePng,
      destination: canvas,
      destinationX: frame.xOffset,
      destinationY: frame.yOffset,
    });

    // Snapshot the canvas *right now* as this frame's final appearance,
    // before any disposal cleanup runs. PNG.sync.write serializes the
    // current pixel state into a standalone buffer, decoupled from future
    // mutations to `canvas`.
    canvasBuffers.push(Buffer.from(PNG.sync.write(canvas)));

    // If this frame says "restore to background" once it's done being
    // shown, clear just the region it drew back to transparent before the
    // next frame is composited on top.
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

// Draws `source` onto `destination` at (destinationX, destinationY), but
// unlike PNG.bitblt, this SKIPS any source pixel whose alpha is 0
// (fully transparent). This distinction matters for GIFs: a frame's
// transparent pixels mean "nothing changed here, leave the previous frame's
// content showing," not "draw nothing (blank) here." A plain bitblt copies
// transparent pixels literally, which would overwrite (erase) whatever the
// previous frame drew in that spot -- that was the cause of the flashing
// bug.
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
      // PNG pixel data is packed as 4 bytes per pixel (R, G, B, A) in a flat
      // buffer, so this converts a 2D (row, column) position into that
      // buffer's byte offset. The << 2 is a fast way to multiply by 4.
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

// Sets alpha to 0 (fully transparent) for every pixel in the given
// rectangular region of the canvas. Used to implement "restore to
// background" disposal: after a frame using that disposal method is done,
// its drawn region should go back to being empty before the next frame is
// composited.
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

// A rectangle expressed as absolute min/max pixel coordinates (inclusive)
// rather than x/y/width/height, since that makes union/intersection math
// (see computeUnionBoundingBox) simpler.
type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

// Scans every pixel in a PNG and returns the smallest bounding box that
// contains all non-transparent (alpha !== 0) pixels. Returns null if the
// entire image is transparent (nothing visible to bound).
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

  // If maxX/maxY never advanced past their initial -1, no opaque pixel was
  // found at all.
  if (maxX === -1 || maxY === -1) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

// Crops a PNG down to the given bounding box, then pads it out to a square
// (nanoemoji/font glyphs are expected to sit in a square cell). The sprite
// is centered horizontally and bottom-aligned vertically within that square
// (destY places it flush with the bottom), which matches how these sprites
// tend to look best sitting on a text baseline.
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

// Used for static sprites: finds that single image's own visible bounding
// box (no sharing needed, since there's only one frame per Pokemon here)
// and crops to it. Falls back to a 1x1 transparent pixel if the sprite is
// entirely transparent (shouldn't normally happen, but avoids a crash).
async function cropTransparentBuffer(buffer: Buffer) {
  const png = PNG.sync.read(buffer);
  const boundingBox = findVisibleBoundingBox(png);

  if (boundingBox === null) {
    return Buffer.from(PNG.sync.write(new PNG({ width: 1, height: 1 })));
  }

  return cropToBoundingBox(png, boundingBox);
}

main();
