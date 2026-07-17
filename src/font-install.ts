import { getDefaultedArgs } from "./args-parse";
import { copyFileSync } from "node:fs";
import { DIST_DIR } from "./paths";
import { join } from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const type = os.platform();
const args = getDefaultedArgs(process.argv);
const file = `${args.fontFamily}.ttf`;

switch (type) {
  case "darwin": {
    copyFileSync(
      join(DIST_DIR, file),
      join(os.homedir(), "Library", "Fonts", file),
    );
    break;
  }
  case "linux": {
    copyFileSync(
      join(DIST_DIR, file),
      join(os.homedir(), ".local", "share", "fonts", file),
    );
    spawnSync("fc-cache", ["-f"]);
    break;
  }
  default: {
    console.warn("Platform not supported, did not install font");
  }
}
