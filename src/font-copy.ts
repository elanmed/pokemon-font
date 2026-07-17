import { getDefaultedArgs } from "./args-parse";
import { copyFileSync } from "node:fs";
import { BUILD_DIR, DIST_DIR } from "./paths";
import { join } from "node:path";

const args = getDefaultedArgs(process.argv);
const file = `${args.fontFamily}.ttf`;
copyFileSync(join(BUILD_DIR, file), join(DIST_DIR, file));
