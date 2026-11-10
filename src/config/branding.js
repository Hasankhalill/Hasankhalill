/**
 * Reel & Tide branding.
 * Change the store name, colors, contact details, WhatsApp number,
 * marketing copy, and which photos the homepage uses from this file.
 * Product prices and specs live in src/data/products.js.
 * Photo URLs live in src/data/images.js.
 */
export const branding = {
  name: "Reel & Tide",
  tagline: "Gear for time on the water",
  cartStorageKey: "reel-and-tide-cart",
  currency: {
    code: "USD",
    locale: "en-US",
  },
  colors: {
    navy: "#10243F",
    "navy-deep": "#071422",
    teal: "#1F6A66",
    "teal-deep": "#144E4B",
    warm: "#F3EFE7",
    cream: "#E6DFD2",
    paper: "#FFFCF7",
    accent: "#E08A3C",
    "accent-deep": "#C56E28",
    ink: "#1A2433",
    muted: "#3E4C5C",
    line: "#E0D8CC",
    danger: "#8E3B32",
  },
  contact: {
    email: "hassankhalil10108@gmail.com",
    phoneDisplay: "+96176332281",
    phoneTel: "+96176332281",
    whatsapp: "96176332281",
    whatsappMessage: "Hello, I have a question about the Reel & Tide sample catalog.",
    addressLines: ["This is an online store."],
    hours: ["Monday to Friday, 9:00–6:00"],
  },
  images: {
    hero: "surfRod",
    promo: "wave",
    about: "wading",
    aboutSecondary: "alpineBoat",
  },
  copy: {
    metaDescription:
      "Sample fishing shop for rods, reels, line, hooks, lures, tackle boxes, nets, and accessories.",
    announcement:
      "Sample storefront. The catalog, contact form, and checkout are for demonstration and are not connected to a backend.",
    headline: "Your Next Great Catch Starts Here",
    subheadline:
      "Compare rods, reels, line, and the smaller pieces that finish a rig. This sample shop is for browsing — listings are examples, and nothing is for sale.",
    shopCta: "Shop Equipment",
    searchPlaceholder: "Search rods, reels, lures…",
    categoriesTitle: "Shop by category",
    categoriesLead: "Eight places to start, from the rod in your hand to the box it travels in.",
    bestsellersTitle: "Bestsellers",
    bestsellersLead: "A sample selection of gear this catalog puts forward first.",
    newArrivalsTitle: "New arrivals",
    newArrivalsLead: "Pieces marked as recent additions in this sample catalog.",
    promoTitle: "Color you can follow through the cast",
    promoBody:
      "High-visibility mainline sits in the sample catalog for anglers who like to watch the line leave the spool.",
    promoCta: "Shop lines",
    promoHref: "/shop?category=lines",
    aboutTitle: "Arranged around a day on the water",
    aboutParagraphs: [
      "Reel & Tide is a sample storefront for people who like to plan a fishing day before they leave the house. The shelves here are rods, reels, line, hooks, lures, boxes, nets, and a few accessories, each with the measurements written out.",
      "The shop is a demonstration. Names, prices, and photographs are examples so the catalog can be browsed. It does not take orders, and it is not a record of a real business, a founding year, or a list of credentials.",
      "What the layout cares about is clarity: what a piece of gear is for, which options it comes in, and whether the sample listing is in stock. The rest — payment, shipping, and a person answering the form — would belong to a backend this demo does not include.",
    ],
    footerBlurb:
      "A demonstration fishing shop. Browse the sample catalog, then change the name, colors, and products from the branding and data files.",
    sampleLabel: "Sample product",
    sampleDisclaimer:
      "Demonstration store. Product names, prices, and photographs are samples. This site does not accept orders or payment.",
    imageNote: "Sample photograph for this demonstration. It is not a manufacturer pack shot.",
    hoursLabel: "Sample hours",
    addressLabel: "Sample address",
    addToCart: "Add to cart",
    addedToCart: "added to the cart.",
    outOfStock: "Out of stock",
    inStock: "In stock",
    contactTitle: "Write to the shop",
    contactLead:
      "The form below stays in the browser. It checks that the fields are filled in, then tells you the message was not delivered.",
    demoFormNotice: "Demo only. This form needs a backend before a message can be delivered.",
    demoFormNote: "Nothing was sent. Connect a backend to deliver messages to the shop email.",
    whatsappLabel: "Message on WhatsApp",
    cartTitle: "Your cart",
    emptyCart: "Your cart is empty.",
    checkoutCta: "Continue to demo checkout",
    demoCheckoutNote:
      "Demo checkout. This store does not charge a card or place an order. Connect a payment and order backend before anyone can buy.",
    demoCheckoutResult: "No order was placed, and no payment was taken.",
    shippingNote: "Shipping and tax are not calculated in this demo.",
  },
};

export function applyBranding(target = document) {
  const root = target.documentElement;
  for (const [key, value] of Object.entries(branding.colors)) {
    root.style.setProperty(`--brand-${key}`, value);
  }
  target.title = branding.name;
  const description = target.getElementById?.("meta-description");
  if (description) description.setAttribute("content", branding.copy.metaDescription);
}

export function whatsappHref() {
  const text = encodeURIComponent(branding.contact.whatsappMessage);
  return `https://wa.me/${branding.contact.whatsapp}?text=${text}`;
}
