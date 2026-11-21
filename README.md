# licenroute.github.io

Static website for [LicenRoute](https://github.com/licenroute/licenroute): plain HTML and CSS, one small script that
replays real CLI output, no build step, no analytics, no third-party requests.

- `index.html` (English) · `es/index.html` (Spanish)
- `llms.txt`: summary and usage rules for AI assistants and agents
- `robots.txt`, `sitemap.xml`

Served by GitHub Pages from `main` (root) at https://licenroute.com (see `CNAME`). Preview locally with `python3 -m http.server` in this folder.

When `styles.css` or `site.js` change, bump the `?v=` stamp in every page (GitHub Pages lets browsers cache them for 10 minutes).
