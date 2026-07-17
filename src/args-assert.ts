import { parseArgs } from "node:util";
import { options } from "./parse-args-opts";

async function main() {
  const args = process.argv.slice(2);
  const { values } = parseArgs({ args, options });

  if (values.help) {
    console.log(`Usage: run.sh [options]

Options:
  -a, --animated           Include animation frames
  -f, --font-name <name>   Specify a font name
  -h, --help               Show this help message`);
    process.exit(1);
  }
}

main();
