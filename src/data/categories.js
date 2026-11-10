export const categories = [
  {
    id: "rods",
    name: "Fishing rods",
    description: "Surf, boat, and bank rods with length, power, and line ratings listed.",
    image: "surfRod",
  },
  {
    id: "reels",
    name: "Reels",
    description: "Spinning and conventional reels, with size and retrieve side as options.",
    image: "studioReel",
  },
  {
    id: "lines",
    name: "Lines",
    description: "Fluorocarbon and high-visibility mainline in sample spool lengths.",
    image: "colorLine",
  },
  {
    id: "hooks",
    name: "Hooks",
    description: "Single hooks in a few sizes and finishes, sold as sample packs.",
    image: "ringedHooks",
  },
  {
    id: "lures",
    name: "Lures and bait",
    description: "Hard baits and a swimmer for covering water.",
    image: "lureKit",
  },
  {
    id: "tackle",
    name: "Tackle boxes",
    description: "A case for plugs, with room counted in trays.",
    image: "plugCase",
  },
  {
    id: "nets",
    name: "Nets",
    description: "A bank landing net and a mesh keep net.",
    image: "troutNet",
  },
  {
    id: "accessories",
    name: "Fishing accessories",
    description: "A foam vest and chest waders from the sample accessory shelf.",
    image: "wading",
  },
];

export const categoriesById = Object.fromEntries(categories.map((category) => [category.id, category]));
