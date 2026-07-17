# pokemon-font

Build a TrueType font containing sprites for the first 151 Pokémon.

Each Pokemon is mapped to a Private Use Area codepoint starting at `U+100000`,
so they can be typed like regular glyphs. Both static and animated (Generation
V) sprites are supported.

## Requirements

- [Bun](https://bun.sh)
- Python 3 (for the `nanoemoji` virtualenv)
- macOS or Linux (font installation step)

## Quick start

Run the whole pipeline with the included script:

```sh
./run.sh
```

This will:

1. Create a Python virtualenv and install `nanoemoji`.
2. Download Pokémon sprites from [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
3. Build the font with `nanoemoji`.
4. Copy the `.ttf` to `dist/`.
5. Install the font locally.

The font is written to `dist/<font-name>.ttf`.

## Options

Pass these flags to `run.sh` or the individual `bun run` scripts:

| Flag                       | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `-a`, `--animated`         | Include animation frames from Generation V sprites |
| `-f`, `--font-name <name>` | Set the generated font family name                 |
| `-h`, `--help`             | Show help                                          |

Examples:

```sh
# Build an animated font
./run.sh --animated

# Build a font with a custom name
./run.sh --font-name "My Pokemon Font"
```

## Scripts

| Script                  | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `bun run font-download` | Download sprites to `raw-assets/` and `processed-assets/` |
| `bun run font-build`    | Run `nanoemoji` and output `build/<font-name>.ttf`        |
| `bun run font-copy`     | Copy the built font to `dist/`                            |
| `bun run font-install`  | Install the font for the current user                     |
| `bun run font-preview`  | Serve a preview page at `http://localhost:3000`           |

## Preview

After building, start the preview server:

```sh
bun run font-preview
```

Then open [http://localhost:3000](http://localhost:3000).
