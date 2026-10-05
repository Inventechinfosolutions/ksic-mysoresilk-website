# KSIC Mysore Silk — Home page redesign

Static, data-driven home page. No build step.

## Run locally
```bash
python3 -m http.server 5173
```
Open http://localhost:5173

## Structure
- `index.html` — page markup
- `css/style.css` — design tokens + all styles (ivory / maroon / gold, Cormorant Garamond + Manrope)
- `js/main.js` — rendering, cart, quick view, and all motion
- `assets/data/products.json` — catalog scraped from ksicsilk.com: 19 saree articles → 31 designs
  (getDesign pages) → colour palettes (48 plain, 19 contrast-border), plus 16 menswear items with size options
  and the site's shipping / colour / return policies
- `assets/data/products.js` — same data exposed as `window.KSIC_CATALOG` (what the page loads)
- `assets/images/sarees|mens|brand|site` — images downloaded from ksicsilk.com

## Dynamic parts
- Saree edit + menswear grid render from `KSIC_PRODUCTS`; price and category filters.
- Quick view mirrors the live getDesign / getDetails pages: pick design, then colour (required for sarees)
  or size (required for shirts/kurtas); ties and gift boxes add directly.
- Bag lines store the same fields the live site posts to `/ShoppingCart/AddToCart`
  (articleId, designId, colour id `BDId`, size), so a real backend can accept them as-is.
- Bag drawer, saved per browser in localStorage.
- To go live: replace `products.js` with a fetch to the store API, and wire the Checkout button
  and newsletter form to the real backend (both are front-end only today).

## Motion
GSAP 3 + ScrollTrigger + Lenis (CDN). Preloader, mouse + scroll parallax hero, word-by-word text reveal,
clip-path image reveals, pinned product showcase (Insta360-style), horizontal-scroll saree edit,
parallax banner. Respects `prefers-reduced-motion`; page works without JS/CDN.
