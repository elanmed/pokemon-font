#!/usr/bin/env node
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { options } from "./parse-args-opts";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const nanoemojiBinaryPath = join(
  scriptDirectory,
  "nanoemoji-env",
  "bin",
  "nanoemoji",
);

const args = process.argv.slice(2);
const { values } = parseArgs({ args, options });

const fontFamily = values["font-name"] ?? values.pokemon;
if (!fontFamily) {
  console.error("Must provide --pokemon or --font-name");
  process.exit(1);
}

const svgsDirectory = join(scriptDirectory, "processed-assets");
const emojiSvgPaths = readdirSync(svgsDirectory)
  .filter(
    (fileName) => fileName.startsWith("emoji_u") && fileName.endsWith(".svg"),
  )
  .map((fileName) => join(svgsDirectory, fileName));

const outputFilePath = `${fontFamily}.ttf`;

const nanoemojiResult = spawnSync(
  nanoemojiBinaryPath,
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
      PATH: `${join(scriptDirectory, "nanoemoji-env", "bin")}:${process.env.PATH}`,
    },
  },
);

if (nanoemojiResult.status !== 0) {
  process.exit(nanoemojiResult.status ?? 1);
}

console.log(`${outputFilePath} written to ${join(scriptDirectory, "build")}`);
