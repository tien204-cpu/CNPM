# Frontend image mapping and UI notes

This project uses a small image-mapping strategy to improve product photos shown in the demo UI.

How images are chosen (priority):
1. If the product object returned by the API contains `imageUrl`, that URL is used.
2. `src/image-map.ts` — a central mapping that lets you map product `id` or normalized `name` (slug) to a curated image URL or local `/images/...` path.
3. Generated fallback via keyword services (loremflickr) or deterministic `picsum` seed based on product name.

To add your own images:
- Put files in `frontend/public/images/` (for example `public/images/margherita-pizza.jpg`).
- Add a mapping in `src/image-map.ts` either by ID in `BY_ID` or by slug in `BY_SLUG`.

Tests
- The Playwright E2E checks that product images exist and that `img[alt]` matches the product name. If you add local images, ensure the dev server serves them from `/images/<file>`.

If you want, I can add a set of sample CC0 images into `public/images/` and populate `BY_SLUG` for a nicer visual.
