import { parseArgs } from "node:util";

export const options = {
  animated: {
    type: "boolean",
    short: "a",
  },
  ["font-name"]: {
    type: "string",
    short: "f",
  },
  help: {
    type: "boolean",
    short: "h",
  },
} as const;

export function getDefaultedArgs(args: string[]) {
  const slicedArgs = args.slice(2);
  const { values } = parseArgs({ args: slicedArgs, options });

  const animated = values.animated ?? false;
  const defaultName = animated ? "Pokemon 151 (Animated)" : "Pokemon 151";
  const fontFamily = values["font-name"] ?? defaultName;
  return {
    animated,
    fontFamily,
    help: values.help ?? false,
  };
}
