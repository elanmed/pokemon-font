import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const PROCESSED_ASSETS_DIR = join(SCRIPT_DIR, "processed-assets");
export const BUILD_DIR = join(SCRIPT_DIR, "build");
export const NANOEMOJI_BIN_DIR = join(SCRIPT_DIR, "nanoemoji-env", "bin");
export const NANOEMOJI_BIN = join(NANOEMOJI_BIN_DIR, "nanoemoji");
