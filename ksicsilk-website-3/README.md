# KSIC Mysore Silk — Website Version 3

Dark emerald and gold home page for KSIC Mysore Silk, built from the design in `design/mockup.png`.

Plain HTML, CSS and JavaScript — no build step.

## Run locally

```bash
python3 -m http.server 5200
```

Then open http://localhost:5200.

## Deploy

Live: https://ksic-website-version3.bankey-lal.workers.dev

Hosted on Cloudflare Workers static assets (`wrangler.jsonc`). `.assetsignore` keeps git files, the design mockup, README and config out of the upload.

```bash
npx wrangler deploy
```

## Structure

```
index.html            the page
assets/css/style.css  styles and responsive layouts (1240px, 1080px, 760px, 400px)
assets/js/main.js     header, hero slider, product carousel, wishlist/bag, video modal, newsletter, scroll animations
assets/img/           section photos (Magnific-enhanced)
assets/brand/         KSIC logo (original, HD, gold version) and favicon
assets/video/         brand story video shown by "Watch our story"
design/mockup.png     reference design
```

## Notes

- Wishlist and bag counts are stored in the visitor's browser only; they are not connected to a shop backend.
- The newsletter form validates the email address but does not send it anywhere yet.
- Animations are skipped for visitors who have reduced motion turned on.
