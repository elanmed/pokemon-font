#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import {
  BUILD_DIR,
  NANOEMOJI_BIN,
  NANOEMOJI_BIN_DIR,
  PROCESSED_ASSETS_DIR,
} from "./paths";
import { join } from "node:path";
import { getDefaultedArgs } from "./args-parse";

const args = getDefaultedArgs(process.argv);

const emojiSvgPaths = readdirSync(PROCESSED_ASSETS_DIR)
  .filter(
    (fileName) => fileName.startsWith("emoji_u") && fileName.endsWith(".svg"),
  )
  .map((fileName) => join(PROCESSED_ASSETS_DIR, fileName));

const outputFilePath = `${args.fontFamily}.ttf`;

const nanoemojiResult = spawnSync(
  NANOEMOJI_BIN,
  [
    "--color_format",
    "sbix",
    "--bitmap_resolution",
    "160",
    "--upem",
    "160",
    "--family",
    args.fontFamily,
    "--output_file",
    outputFilePath,
    ...emojiSvgPaths,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${NANOEMOJI_BIN_DIR}:${process.env.PATH}`,
    },
  },
);

if (nanoemojiResult.status !== 0) {
  process.exit(nanoemojiResult.status ?? 1);
}

console.log(`${outputFilePath} written to ${BUILD_DIR}`);
