import { parseArgs } from "node:util";
import { options } from "./parse-args-opts";

async function main() {
  const args = process.argv.slice(2);
  const { values } = parseArgs({ args, options });

  if (values.help || !values.pokemon) {
    console.log(`Usage: run.sh [options]

Options:
  -p, --pokemon <name>     Validate a Pokémon name
  -f, --font-name <name>   Specify a font name
  -h, --help               Show this help message`);
    process.exit(1);
  }

  const numPokemonRes = await fetch("https://pokeapi.co/api/v2/pokemon");
  const numPokemonData = await numPokemonRes.json();
  const numPokemon = (numPokemonData as { count: number }).count;

  const allPokemonRes = await fetch(
    `https://pokeapi.co/api/v2/pokemon/?limit=${numPokemon}`,
  );
  const allPokemonData = await allPokemonRes.json();
  const allPokemon = new Set(
    (allPokemonData as { results: { name: string }[] }).results.map(
      (result) => result.name,
    ),
  );

  if (!allPokemon.has(values.pokemon)) {
    console.error("Invalid pokemon name");
    process.exit(1);
  }
}

main();
