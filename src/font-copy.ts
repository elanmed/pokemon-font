import { getDefaultedArgs } from "./args-parse";
import { copyFileSync } from "node:fs";
import { BUILD_DIR, DIST_DIR, SRC_DIR } from "./paths";
import { join } from "node:path";

const args = getDefaultedArgs(process.argv);
const fontFileName = `${args.fontFamily}.ttf`;
copyFileSync(join(BUILD_DIR, fontFileName), join(DIST_DIR, fontFileName));
copyFileSync(
  join(SRC_DIR, "font-preview.html"),
  join(DIST_DIR, "font-preview.html"),
);
