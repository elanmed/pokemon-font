# pokemon-font

Build a TrueType font containing sprites for the first 151 Pokémon.

Each Pokémon is mapped to a codepoint in Supplementary Private Use Area-B
starting at `U+100000`, so they can be typed like regular glyphs. Both static
and animated (Generation V) sprites are supported.

## Requirements

- [Bun](https://bun.sh)
- Python 3 (for the `nanoemoji` virtualenv)
- macOS or Linux (font installation; other scripts run on any platform with Bun)

## Quick start

Run the whole pipeline with the included script:

```sh
./run.sh
```

This will:

1. Create a Python virtualenv and install `nanoemoji`.
2. Download Pokémon sprites from [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
3. Convert sprites to SVGs and store them in `processed-assets/`.
4. Build the font with `nanoemoji`.
5. Copy the `.ttf` to `dist/`.
6. Install the font locally.

The default font is written to `dist/Pokemon 151.ttf`.

## Options

Pass these flags to `run.sh` or the individual `bun run` scripts:

| Flag                       | Description                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `-a`, `--animated`         | Include animation frames from Generation V sprites; default name becomes `Pokemon 151 (Animated)` |
| `-f`, `--font-name <name>` | Set the generated font family name and output filename                                            |
| `-h`, `--help`             | Show help                                                                                         |

Examples:

```sh
# Build an animated font
./run.sh --animated

# Build a font with a custom name
./run.sh --font-name "My Pokemon Font"
```

## Codepoint mapping

Pokémon are assigned in National Pokédex order:

- Bulbasaur → `U+100000`
- Ivysaur → `U+100001`
- Venusaur → `U+100002`
- ...
- Mew → `U+100096`

In JavaScript, you can render a specific Pokémon with `String.fromCodePoint(0x100000 + id - 1)`.

## Scripts

| Script                  | Description                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `bun run font-download` | Download sprites from PokeAPI and generate SVGs in `processed-assets/` plus raw PNGs in `raw-assets/` |
| `bun run font-build`    | Run `nanoemoji` and output `build/<font-name>.ttf`                                                    |
| `bun run font-copy`     | Copy the built font to `dist/`                                                                        |
| `bun run font-install`  | Install the font for the current user (macOS/Linux only)                                              |
| `bun run font-preview`  | Serve `dist/font-preview.html` and the font at `http://localhost:3000`                                |

## Preview

After building, start the preview server:

```sh
bun run font-preview
```

Then open [http://localhost:3000](http://localhost:3000).
