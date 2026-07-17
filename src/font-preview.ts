import { join } from "node:path";
import { DIST_DIR } from "./paths";
import { getDefaultedArgs } from "./args-parse";

const args = getDefaultedArgs(process.argv);
const fontFileName = `${args.fontFamily}.ttf`;
const port = 3000;

Bun.serve({
  port,
  fetch(request) {
    const requestUrl = new URL(request.url);
    const requestedPath =
      requestUrl.pathname === "/"
        ? "font-preview.html"
        : decodeURIComponent(requestUrl.pathname.slice(1));
    const filePath = join(DIST_DIR, requestedPath);
    const file = Bun.file(filePath);
    return new Response(file);
  },
});

console.log(`Serving ${fontFileName} and font-preview.html from ${DIST_DIR}`);
console.log(`http://localhost:${port}`);
