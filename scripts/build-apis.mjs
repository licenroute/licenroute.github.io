#!/usr/bin/env node
// Market v2, B5: public pages for the APIs in the LicenRoute Market, generated from its catalogue.
//   node scripts/build-apis.mjs --catalog <file or URL of catalog.json> [--date YYYY-MM-DD] [--out .] [--allow-http]
// Writes apis/<slug>/index.html (with schema.org WebAPI data), apis/index.html, and the APIs section of sitemap.xml
// and llms.txt (between markers). Removes pages it generated before for APIs no longer in the catalogue.
// Run by hand before each publication (no CI). Only https links are accepted unless --allow-http (local tests).
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const SITE = "https://licenroute.com";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CSS = "../../styles.css?v=202611221500";

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
// JSON inside <script>: no "</" sequence can close the tag.
const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const money = (minor, cur) => (minor == null ? null : `${(minor / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`);
const num = (n) => Number(n ?? 0).toLocaleString("es-ES");

export function validate(catalog, { allowHttp = false } = {}) {
  if (catalog?.version !== "licenroute.market.catalog/v1" || !Array.isArray(catalog.listings)) throw new Error("not a licenroute.market.catalog/v1 document");
  const okUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" || (allowHttp && x.protocol === "http:"); } catch { return false; } };
  const seen = new Set();
  return catalog.listings.filter((l) => {
    if (!l.slug || !SLUG.test(l.slug) || l.slug.length > 80 || seen.has(l.slug)) return false;
    if (!okUrl(l.url) || (l.plans ?? []).some((p) => !okUrl(p.purchase_url))) return false;
    if (l.docs_url && !okUrl(l.docs_url)) l.docs_url = null;
    if (l.status_url && !okUrl(l.status_url)) l.status_url = null;
    seen.add(l.slug);
    return true;
  });
}

function page({ title, description, canonical, body, jsonld, css }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#f2a516">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:site_name" content="LicenRoute">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${css}">
<script type="application/ld+json">${ld(jsonld)}</script>
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="/es/" aria-label="LicenRoute, inicio"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
    <nav class="top" aria-label="Principal">
      <a href="/apis/">APIs</a>
      <a class="opt" href="/guides/">Guías</a>
      <a class="opt" href="https://github.com/licenroute/licenroute">GitHub</a>
    </nav>
  </div>
</header>

<main id="main" class="prose">
${body}
</main>

<footer class="site">
  <div class="wrap">
    <div>
      <a class="brand" href="/es/"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
      <p class="legal">El carril de pago de tu API. Precios en modo de pruebas: no se cobra dinero real.</p>
    </div>
    <nav aria-label="Pie">
      <a href="/apis/">APIs</a>
      <a href="/es/">Publica tu API</a>
      <a href="/llms.txt">llms.txt</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

export function apiPage(l) {
  const canonical = `${SITE}/apis/${l.slug}/`;
  const plans = l.plans ?? [];
  const primary = plans.find((p) => p.trial_units != null) ?? plans.find((p) => p.access === "instant") ?? plans[0];
  const planHtml = plans.map((p) => {
    const price = money(p.price_minor, p.currency);
    const facts = [p.quota_units != null ? `${num(p.quota_units)} peticiones` : null, p.duration_days ? `${p.duration_days} días` : null,
      p.trial_units != null ? `prueba gratis de ${num(p.trial_units)} peticiones` : null].filter(Boolean).join(" · ");
    const cta = p.trial_units != null ? "Probar gratis" : p.access === "instant" ? "Comprar" : p.access === "cooperative" ? "Solicitar acceso" : "Solicitar acceso";
    return `  <section class="plan" aria-labelledby="plan-${esc(p.id)}">
    <h3 id="plan-${esc(p.id)}">${esc(p.name)}</h3>
    <p><strong>${esc(price ?? "Sin coste")}</strong>${facts ? ` · ${esc(facts)}` : ""}</p>
    <p><a class="btn ${p === primary ? "btn-primary" : "btn-quiet"}" href="${esc(p.purchase_url)}" rel="nofollow">${cta}</a></p>
  </section>`;
  }).join("\n");
  const example = l.example ? `  <h2>Ejemplo</h2>
${l.example.request ? `  <p class="meta">Petición</p>\n  <pre class="block">${esc(l.example.request)}</pre>` : ""}
${l.example.response ? `  <p class="meta">Respuesta</p>\n  <pre class="block">${esc(l.example.response)}</pre>` : ""}` : "";
  const links = [l.docs_url ? `<a href="${esc(l.docs_url)}" rel="nofollow noopener">Documentación</a>` : null,
    l.status_url ? `<a href="${esc(l.status_url)}" rel="nofollow noopener">Estado del servicio</a>` : null,
    `<a href="${esc(l.url)}" rel="nofollow">Ficha en el Market</a>`].filter(Boolean).join(" · ");
  const body = `  <p class="meta"><a href="/apis/">APIs</a> · ${esc(l.category)}</p>
  <h1>${esc(l.title)}</h1>
  <p class="lead">${esc(l.summary)}</p>
  <p class="meta">Publicada por ${esc(l.publisher)} · ${num(l.served_last_30_days)} peticiones servidas en los últimos 30 días</p>
${l.description ? l.description.split(/\n{2,}/).map((para) => `  <p>${esc(para).replace(/\n/g, "<br>")}</p>`).join("\n") : ""}
${example}
  <h2>Planes</h2>
${planHtml || "  <p>Sin planes disponibles ahora mismo.</p>"}
  <p class="meta">${links}</p>
  <p class="meta">Precios en modo de pruebas: el pago se hace con Stripe en modo test y no se cobra dinero real. La clave llega al terminar el pago o al activar la prueba.</p>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "WebAPI", name: l.title, description: l.summary, url: canonical,
    ...(l.docs_url ? { documentation: l.docs_url } : {}), provider: { "@type": "Organization", name: l.publisher },
    offers: plans.filter((p) => p.price_minor != null).map((p) => ({ "@type": "Offer", name: p.name, price: (p.price_minor / 100).toFixed(2), priceCurrency: p.currency, url: p.purchase_url }))
  };
  return page({ title: `${l.title}: API | LicenRoute`, description: l.summary, canonical, body, jsonld, css: CSS });
}

export function indexPage(listings) {
  const canonical = `${SITE}/apis/`;
  const items = listings.map((l) => `    <li><a href="${esc(l.slug)}/"><strong>${esc(l.title)}</strong><span>${esc(l.summary)}</span></a></li>`).join("\n");
  const body = `  <h1>APIs con prueba gratis</h1>
  <p class="lead">APIs que puedes probar gratis y comprar en un minuto. Cada una cobra con LicenRoute; el dinero va directo a quien la publica.</p>
  <ul class="guide-list">
${items || "    <li>Pronto habrá APIs aquí.</li>"}
  </ul>
  <p><a class="btn btn-quiet" href="/es/">Publica tu API</a></p>`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: "APIs con prueba gratis", url: canonical,
    hasPart: listings.map((l) => ({ "@type": "WebAPI", name: l.title, url: `${SITE}/apis/${l.slug}/` })) };
  return page({ title: "APIs con prueba gratis | LicenRoute", description: "APIs que puedes probar gratis y comprar en un minuto, publicadas en el Market de LicenRoute.", canonical, body, jsonld, css: "../styles.css?v=202611221500" });
}

// Replaces the text between two marker lines (or appends the block before `anchor`).
export function replaceBlock(text, start, end, block, anchor) {
  const i = text.indexOf(start), j = text.indexOf(end);
  const full = `${start}\n${block}${block.endsWith("\n") ? "" : "\n"}${end}`;
  if (i !== -1 && j > i) return text.slice(0, i) + full + text.slice(j + end.length);
  const k = anchor ? text.lastIndexOf(anchor) : -1;
  return k === -1 ? `${text.trimEnd()}\n${full}\n` : `${text.slice(0, k)}${full}\n${text.slice(k)}`;
}

export function build({ catalog, out, date, allowHttp = false }) {
  const listings = validate(catalog, { allowHttp });
  const dir = join(out, "apis");
  const manifest = join(dir, "generated.json");
  const before = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")).slugs ?? [] : [];
  for (const old of before) if (SLUG.test(old) && !listings.some((l) => l.slug === old)) rmSync(join(dir, old), { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const l of listings) {
    mkdirSync(join(dir, l.slug), { recursive: true });
    writeFileSync(join(dir, l.slug, "index.html"), apiPage(l));
  }
  writeFileSync(join(dir, "index.html"), indexPage(listings));
  writeFileSync(manifest, JSON.stringify({ generated_by: "scripts/build-apis.mjs", date, slugs: listings.map((l) => l.slug) }, null, 2) + "\n");

  const sitemapPath = join(out, "sitemap.xml");
  if (existsSync(sitemapPath)) {
    const urls = [`${SITE}/apis/`, ...listings.map((l) => `${SITE}/apis/${l.slug}/`)].map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`).join("\n");
    writeFileSync(sitemapPath, replaceBlock(readFileSync(sitemapPath, "utf8"), "  <!-- apis:start -->", "  <!-- apis:end -->", urls, "</urlset>"));
  }
  const llmsPath = join(out, "llms.txt");
  if (existsSync(llmsPath)) {
    const lines = ["## APIs in the LicenRoute Market", "", "APIs that can be tried for free and bought in a minute (test mode prices). Machine-readable catalogue: the Market's /market/catalog.json; MCP server: packages/market-mcp in the repository.", "",
      ...listings.map((l) => `- [${l.title}](${SITE}/apis/${l.slug}/): ${l.summary}`)].join("\n");
    writeFileSync(llmsPath, replaceBlock(readFileSync(llmsPath, "utf8"), "<!-- apis:start -->", "<!-- apis:end -->", lines));
  }
  return listings.map((l) => l.slug);
}

async function main() {
  const { values } = parseArgs({ options: { catalog: { type: "string" }, out: { type: "string", default: "." }, date: { type: "string" }, "allow-http": { type: "boolean", default: false } } });
  if (!values.catalog) { console.error("usage: node scripts/build-apis.mjs --catalog <file or URL> [--date YYYY-MM-DD] [--out .] [--allow-http]"); process.exit(2); }
  const raw = /^https?:\/\//.test(values.catalog)
    ? await (await fetch(values.catalog, { redirect: "error", signal: AbortSignal.timeout(15_000) })).text()
    : readFileSync(values.catalog, "utf8");
  const slugs = build({ catalog: JSON.parse(raw), out: values.out, date: values.date ?? new Date().toISOString().slice(0, 10), allowHttp: values["allow-http"] });
  console.log(`${slugs.length} API pages: ${slugs.join(", ") || "(none)"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
