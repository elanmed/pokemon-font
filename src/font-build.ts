#!/usr/bin/env node
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { options } from "./parse-args-opts";
import {
  BUILD_DIR,
  NANOEMOJI_BIN,
  NANOEMOJI_BIN_DIR,
  PROCESSED_ASSETS_DIR,
} from "./paths";
import { join } from "node:path";

const args = process.argv.slice(2);
const { values } = parseArgs({ args, options });

const fontFamily = values["font-name"] ?? values.pokemon;
if (!fontFamily) {
  console.error("Must provide --pokemon or --font-name");
  process.exit(1);
}

const emojiSvgPaths = readdirSync(PROCESSED_ASSETS_DIR)
  .filter(
    (fileName) => fileName.startsWith("emoji_u") && fileName.endsWith(".svg"),
  )
  .map((fileName) => join(PROCESSED_ASSETS_DIR, fileName));

const outputFilePath = `${fontFamily}.ttf`;

const nanoemojiResult = spawnSync(
  NANOEMOJI_BIN,
  [
    "--color_format",
    "sbix",
    "--family",
    fontFamily,
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
