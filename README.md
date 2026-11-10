# Hycare supermarket

Online Store 2.0 theme for a supermarket named Hycare. Shopify remains the source of products, prices, inventory, collections, cart, and checkout. This theme does not ship with products, sample prices, or reviews.

## Preview locally

Install the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), then from this directory:

```sh
shopify theme dev
```

The command serves a local preview against a store you choose. It does not publish the theme. `shopify theme push --unpublished` uploads a copy without making it live. Prefer the zip upload in admin when you want a file you can archive.

## Zip layout

The uploadable zip has the theme at the archive root, not inside an extra folder:

```
assets/
blocks/
config/
layout/
locales/
sections/
snippets/
templates/
```

`config/settings_schema.json`, `layout/theme.liquid`, and `templates/index.json` sit at that root.

## Before the catalog exists

Department and subcategory links are theme blocks and, once you create it, a navigation menu with the handle `departments`. Those links render with zero products. A collection URL works as a link before the collection exists, and shows the theme 404 until you create that collection. After the collection exists with no products, the collection template shows an empty state instead of fake items.

Create the collections, the Departments menu, and the footer menus in Shopify admin, then assign the menus in the theme editor. Homepage aisle order is the block order. Header order follows the menu after that menu has links. Reorder either without editing code.

Collection handles used by the preset blocks:

`cleaning-household`, `floor-cleaners`, `surface-cleaners`, `disinfectants`, `dishwashing`, `laundry-detergent`, `cleaning-tools`, `garbage-bags`, `paper-products`, `personal-care`, `hand-wash`, `soap`, `shower-gel`, `shampoo`, `oral-care`, `deodorants`, `tissues`, `food-pantry`, `rice`, `pasta`, `grains`, `flour`, `cooking-oils`, `canned-foods`, `soups`, `sauces`, `spices`, `spreads`, `bread-bakery`, `bread`, `wraps`, `toast`, `pastries`, `bakery`, `snacks-sweets`, `chips`, `crackers`, `biscuits`, `chocolate`, `candy`, `nuts`, `dried-fruit`, `drinks`, `water`, `juices`, `soft-drinks`, `energy-drinks`, `coffee`, `tea`, `protein-foods`, `meat`, `chicken`, `fish`, `seafood`, `eggs`, `plant-based-proteins`, `sports-nutrition`, `dairy-chilled`, `milk`, `cheese`, `yogurt`, `butter`, `chilled-foods`, `fruit-vegetables`, `fresh-fruit`, `vegetables`, `herbs`, `frozen-foods`, `frozen-vegetables`, `frozen-meals`, `frozen-meat`, `ice-cream`, `family-essentials`, `baby-care`, `pet-care`, `other-essentials`.

`sports-nutrition` stays under Protein Foods and is styled as its own aisle. The last department is only `baby-care`, `pet-care`, and `other-essentials`.
