import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = join(fileURLToPath(import.meta.url), "../../");
export const PROCESSED_ASSETS_DIR = join(ROOT_DIR, "processed-assets");
export const RAW_ASSETS_DIR = join(ROOT_DIR, "raw-assets");
export const BUILD_DIR = join(ROOT_DIR, "build");
export const DIST_DIR = join(ROOT_DIR, "dist");
export const NANOEMOJI_BIN_DIR = join(ROOT_DIR, "nanoemoji-env", "bin");
export const NANOEMOJI_BIN = join(NANOEMOJI_BIN_DIR, "nanoemoji");
export const FRAME_COUNTS_PATH = join(ROOT_DIR, "frame-counts.json");
export const SRC_DIR = join(ROOT_DIR, "src");
export const SPRITES_SOURCE_DIR = join(ROOT_DIR, "sprites-source");
export const SPRITES_SOURCE_STATIC_DIR = join(SPRITES_SOURCE_DIR, "static");
export const SPRITES_SOURCE_ANIMATED_DIR = join(SPRITES_SOURCE_DIR, "animated");
