async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    throw new Error("Usage: run.sh [pokemon name]");
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

  if (!allPokemon.has(args[0])) {
    throw new Error("Invalid pokemon name");
  }
}

main();
