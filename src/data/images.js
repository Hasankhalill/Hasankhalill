function unsplashImage({ id, alt, width, height, objectPosition = "center" }) {
  const at = (w) => {
    const h = Math.max(1, Math.round((w * height) / width));
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
  };
  const srcWidth = Math.min(width, 1600);
  const widths = [640, 960, 1280, 1600].filter((w) => w <= width);
  return {
    src: at(srcWidth),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", "),
    alt,
    width: srcWidth,
    height: Math.max(1, Math.round((srcWidth * height) / width)),
    objectPosition,
  };
}

function wikiImage({ dir, file, alt, width, height, objectPosition = "center" }) {
  const encoded = encodeURIComponent(file);
  const at = (w) =>
    `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${encoded}/${w}px-${encoded}`;
  return {
    src: at(1280),
    srcSet: `${at(960)} 960w, ${at(1280)} 1280w`,
    alt,
    width,
    height,
    objectPosition,
  };
}

export const images = {
  surfRod: wikiImage({
    dir: "2/2b",
    file: "CañaDePescaPlayaTardeMediterraneo.jpg",
    alt: "A fishing rod planted in the sand, facing a calm sea",
    width: 1280,
    height: 960,
    objectPosition: "72% 68%",
  }),
  wading: wikiImage({
    dir: "2/2c",
    file: "Fisherman_in_the_lake_with_fishing_rod.jpg",
    alt: "An angler in waders standing in a lake with a fishing rod",
    width: 1280,
    height: 908,
    objectPosition: "70% 42%",
  }),
  inshoreRod: wikiImage({
    dir: "0/05",
    file: "Fishing_rod_&_reel,_Mahamaya_Lake_(01).jpg",
    alt: "Close view of a spinning reel seated on a fishing rod beside the water",
    width: 1280,
    height: 851,
    objectPosition: "42% 48%",
  }),
  silverReel: wikiImage({
    dir: "9/98",
    file: "Fishing_reel.jpg",
    alt: "A silver spinning reel on a cork-handled rod, with blue water behind it",
    width: 1280,
    height: 917,
    objectPosition: "32% 55%",
  }),
  conventionalReel: wikiImage({
    dir: "8/88",
    file: "Fishing_reel_(1).jpg",
    alt: "A hand holding a rod fitted with a gold conventional reel",
    width: 1280,
    height: 853,
    objectPosition: "58% 55%",
  }),
  conventionalReelSide: wikiImage({
    dir: "a/a6",
    file: "Fishing_reel_(2).jpg",
    alt: "A gold conventional reel on a boat rod, with open water behind it",
    width: 1280,
    height: 853,
    objectPosition: "40% 50%",
  }),
  studioReel: wikiImage({
    dir: "a/a4",
    file: "Fishing_reel_2025_G1.jpg",
    alt: "A gold and black spinning reel on a stand against a muted green background",
    width: 1280,
    height: 1216,
  }),
  lureKit: wikiImage({
    dir: "9/99",
    file: "4_hooked_fishing_bait_lures_viz_jig_spoonlure_plug_spinnerbait.jpg",
    alt: "Four fishing lures on stone: a swimbait, a spoon, a crankbait, and a spinner",
    width: 1280,
    height: 521,
    objectPosition: "center",
  }),
  plugCase: wikiImage({
    dir: "b/be",
    file: "Abufiskedrag.jpg",
    alt: "An open wooden case displaying rows of fishing plugs",
    width: 1280,
    height: 893,
  }),
  ringedHooks: wikiImage({
    dir: "5/58",
    file: "Fishing_hooks_on_white_surface.jpg",
    alt: "A row of silver fishing hooks on a white surface",
    width: 1280,
    height: 1264,
    objectPosition: "50% 62%",
  }),
  mixedHooks: wikiImage({
    dir: "9/95",
    file: "FishHooks.JPG",
    alt: "Three single fishing hooks in different sizes and finishes",
    width: 1280,
    height: 960,
  }),
  keepNet: wikiImage({
    dir: "8/8c",
    file: "Landing_net_1.jpg",
    alt: "A round green mesh fishing net with a metal hoop",
    width: 1280,
    height: 960,
    objectPosition: "55% 45%",
  }),
  colorLine: wikiImage({
    dir: "a/a9",
    file: "Fishing_lines_2025_G1.jpg",
    alt: "Two clear spools wound with multi-colored fishing line",
    width: 1280,
    height: 1024,
  }),
  swimbait: wikiImage({
    dir: "1/1c",
    file: "Bluefox_Vibrotail_jig_fishing_lure_29_gr.jpg",
    alt: "A blue and silver fishing lure lying on rock beside the water",
    width: 1280,
    height: 511,
    objectPosition: "center",
  }),
  troutNet: unsplashImage({
    id: "1485452499676-62ab02c20e83",
    alt: "An angler holding a trout above a landing net",
    width: 1600,
    height: 1200,
    objectPosition: "center",
  }),
  boatCrew: unsplashImage({
    id: "1561623497-3ab314e8f8a9",
    alt: "Two people in life jackets handling a net on a fishing boat",
    width: 1600,
    height: 1100,
    objectPosition: "center 42%",
  }),
  lineSplash: unsplashImage({
    id: "1690315735226-5eb9dfca7ef7",
    alt: "Fishing line striking the surface of blue water",
    width: 1600,
    height: 1100,
  }),
  wave: unsplashImage({
    id: "1559827260-dc66d52bef19",
    alt: "An ocean wave under a peach and blue evening sky",
    width: 1800,
    height: 1120,
    objectPosition: "center 60%",
  }),
  sunrise: unsplashImage({
    id: "1476673160081-cf065607f449",
    alt: "Sunrise light across a quiet shoreline",
    width: 1600,
    height: 1000,
  }),
  alpineBoat: unsplashImage({
    id: "1476514525535-07fb3b4ae5f1",
    alt: "The bow of a wooden boat on a mountain lake",
    width: 1600,
    height: 1100,
    objectPosition: "center 70%",
  }),
};

export function resolveImage(key) {
  const image = images[key];
  if (!image) {
    throw new Error(`Unknown image "${key}". Add it to src/data/images.js.`);
  }
  return image;
}
