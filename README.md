# Reel & Tide

A sample online shop for fishing equipment. Browse rods, reels, line, hooks, lures, tackle boxes, nets, and accessories, then add a configured item to a cart that stays in the browser.

The catalog, contact form, and checkout are a demonstration. Nothing is sent to a server, and no order is placed.

## Run it

```bash
npm install
npm run dev
```

The dev server is at [http://127.0.0.1:5173](http://127.0.0.1:5173).

```bash
npm test
npm run build
```

## Change the brand

Edit `src/config/branding.js`.

- Store name, tagline, and the homepage headline
- Colors (navy, teal, warm white, orange, and the supporting tones)
- Email, phone, sample address, hours, and the WhatsApp number and prefilled message
- Marketing copy, the sample-store notices, and which photo keys the hero, promo, and about page use
- Currency and the localStorage key for the cart

Product names, prices, stock, options, and specifications are in `src/data/products.js`. Category names are in `src/data/categories.js`. Photo URLs are in `src/data/images.js`, referenced by key so components do not hardcode the brand or the pictures.

Colors are applied as CSS variables before the app renders, and the interface reads them from those variables.
