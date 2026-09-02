import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { DIST_DIR, FRAME_COUNTS_PATH } from "./paths";
import { getDefaultedArgs } from "./args-parse";
import {
  PRIVATE_USE_AREA_START,
  TOTAL_STATIC_GLYPH_COUNT,
  ANIMATED_FRAME_START_OFFSET,
} from "./constants";

const args = getDefaultedArgs(process.argv);
const fontFileName = `${args.fontFamily}.ttf`;
const port = 3000;

Bun.serve({
  port,
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const requestedPath = requestUrl.pathname.slice(1);

    if (requestedPath === "preview-config.json") {
      const frameCounts = args.animated
        ? JSON.parse(await readFile(FRAME_COUNTS_PATH, "utf8"))
        : [];
      return Response.json({
        fontFamily: args.fontFamily,
        animated: args.animated,
        frameCounts,
        privateUseAreaStart: PRIVATE_USE_AREA_START,
        totalStaticGlyphCount: TOTAL_STATIC_GLYPH_COUNT,
        animatedFrameStartOffset: ANIMATED_FRAME_START_OFFSET,
      });
    }

    const resolvedPath =
      requestedPath === ""
        ? "font-preview.html"
        : decodeURIComponent(requestedPath);
    const filePath = join(DIST_DIR, resolvedPath);
    const file = Bun.file(filePath);
    return new Response(file);
  },
});

console.log(`Serving ${fontFileName} and font-preview.html from ${DIST_DIR}`);
console.log(`http://localhost:${port}`);
