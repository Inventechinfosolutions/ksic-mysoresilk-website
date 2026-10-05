# KSIC Mysore Silk — Storefront Redesign

A multi-page, data-driven e-commerce front end for [ksicsilk.com](https://www.ksicsilk.com/) in a golden-yellow and ivory theme.

## Run locally

Pages load products and showrooms from JSON with `fetch`, so serve the folder over HTTP (opening `index.html` from disk will not load products):

```bash
npm start      # python3 -m http.server 5180  →  http://localhost:5180
```

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: banner carousel, ornate gold-framed category menu, new arrivals (tabbed), shop-by-price bento, heirloom picks, design gallery, heritage bento (`#heritage`), silk care bento (`#silk-care`) |
| `shop.html?cat=sarees\|menswear\|gifting\|all` | Listing with filters (category, price, colour), sort, pagination and search (`&q=`). Filters are kept in the URL |
| `product.html?id=84` | Product detail: gallery with hover zoom, design picker (`&design=`), quantity, add to bag / buy now, specs, care, related and recently viewed |
| `cart.html` | Shopping bag with quantities, move to wishlist, order summary |
| `wishlist.html` | Saved products |
| `showrooms.html?city=` | Store locator with city tabs and search |

## Code

```
assets/css/style.css     all styles (tokens at the top)
assets/js/core.js        header, footer, mega menus, search suggestions, bag/wishlist/recent (localStorage), product card, toasts, scroll reveals
assets/js/home.js        home page
assets/js/shop.js        listing page
assets/js/product.js     product page
assets/js/cart.js        bag + wishlist pages
assets/js/showrooms.js   store locator
data/products.json       35 products, 31 design variants (from ksicsilk.com)
data/showrooms.json      15 showrooms
assets/video/            hero banner video: ksic-banner.webm / .mp4 (muted, web-optimised) + poster
assets/images/web/       optimised WebP images the site uses (full-size originals are kept outside this repo to stay under hosting size limits)
```

The header and footer are rendered by `core.js`, so menu changes are made in one place (`NAV`, `megaHTML`, `PRICE_MENU`, `RTI_MENU`). Price bands (0–15,000 / 15,001–30,000 / 30,001–40,000 / above 40,000 INR) match the ksicsilk.com Categories menu. The RTI menu links to the existing ksicsilk.com pages and PDFs.

## Connecting to the live catalogue

Point `API.products` / `API.showrooms` in `assets/js/core.js` at the ASP.NET endpoints. Each product needs `id, name, article, category, type, gender, color, family, swatch, price, image, description, designs[{id, code, image}]`. `type` is `crepe | georgette | kurta | shirt | tie | gift-set`; `family` drives the colour filter.

## Placeholders

- Checkout and newsletter show a message only; nothing is sent.
- Colour names, colour families and product descriptions in `products.json` were written from the photos — please review.
- Heritage copy (1912, GI no. 11) should be checked by KSIC.
