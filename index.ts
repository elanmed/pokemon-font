import { writeFileSync } from "node:fs";
import { GifUtil } from "gifwrap";
import { PNG } from "pngjs";
import { join } from "node:path";
import assert from "node:assert";
import { parseArgs } from "node:util";
import { options } from "./parse-args-opts";

async function main() {
  const args = process.argv.slice(2);
  const { values } = parseArgs({ args, options });
  assert(values.pokemon);

  const pokemonRes = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${values.pokemon}`,
  );
  const pokemonData = await pokemonRes.json();
  const animationUrl = (
    pokemonData as {
      sprites: {
        versions: {
          ["generation-v"]: {
            ["black-white"]: { animated: { front_default: string } };
          };
        };
      };
    }
  ).sprites.versions["generation-v"]["black-white"].animated.front_default;

  const animationRes = await fetch(animationUrl);
  const animationBlob = await animationRes.blob();
  const animationArrayBuffer = await animationBlob.arrayBuffer();
  writeFileSync(`${args[0]}.gif`, Buffer.from(animationArrayBuffer));
  const gif = await GifUtil.read(`${args[0]}.gif`);
  const privateUseAreaStart = 0x100000;

  for (const [frameIndex, frame] of gif.frames.entries()) {
    const codepoint = privateUseAreaStart + frameIndex;
    const codepointHex = codepoint.toString(16).padStart(4, "0");
    const framePng = new PNG({
      width: frame.bitmap.width,
      height: frame.bitmap.height,
    });
    frame.bitmap.data.copy(framePng.data);
    const framePngBuffer = PNG.sync.write(framePng);
    const framePngBase64 = framePngBuffer.toString("base64");
    const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.bitmap.width}" height="${frame.bitmap.height}" viewBox="0 0 ${frame.bitmap.width} ${frame.bitmap.height}"><image width="${frame.bitmap.width}" height="${frame.bitmap.height}" href="data:image/png;base64,${framePngBase64}"/></svg>`;
    writeFileSync(join("svgs", `emoji_u${codepointHex}.svg`), frameSvg);
  }
}

main();
