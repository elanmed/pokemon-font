import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = join(fileURLToPath(import.meta.url), "../../");
export const PROCESSED_ASSETS_DIR = join(ROOT_DIR, "processed-assets");
export const RAW_ASSETS_DIR = join(ROOT_DIR, "raw-assets");
export const BUILD_DIR = join(ROOT_DIR, "build");
export const NANOEMOJI_BIN_DIR = join(ROOT_DIR, "nanoemoji-env", "bin");
export const NANOEMOJI_BIN = join(NANOEMOJI_BIN_DIR, "nanoemoji");
