import { getDefaultedArgs } from "./args-parse";

async function main() {
  const values = getDefaultedArgs(process.argv);

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
