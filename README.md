# licenroute.github.io

Static website for [LicenRoute](https://github.com/licenroute/licenroute): plain HTML and CSS, one small script that
replays real CLI output, no build step, no analytics, no third-party requests.

- `index.html` (English) · `es/index.html` (Spanish)
- `llms.txt`: summary and usage rules for AI assistants and agents
- `robots.txt`, `sitemap.xml`

Served by GitHub Pages from `main` (root) at https://licenroute.com (see `CNAME`). Preview locally with `python3 -m http.server` in this folder.

When `styles.css` or `site.js` change, bump the `?v=` stamp in every page (GitHub Pages lets browsers cache them for 10 minutes).

## API pages (Market v2, B5)

`scripts/build-apis.mjs` generates `apis/<slug>/index.html` (schema.org `WebAPI`), `apis/index.html` and the APIs
blocks of `sitemap.xml` and `llms.txt` from the Market catalogue. Run it by hand before publishing, once the Market
is online (until then its links would point to a local server):

```bash
node scripts/build-apis.mjs --catalog https://<market>/market/catalog.json
node --test scripts/build-apis.test.mjs
```

## User manual

`manual/` (English) and `es/manual/` (Spanish) are generated from one structure by `scripts/build-manual.mjs`, so both
languages keep the same sections and figures (screenshots in `manual/img/`, taken from the local demo). Edit the text
there and run `node scripts/build-manual.mjs`.
