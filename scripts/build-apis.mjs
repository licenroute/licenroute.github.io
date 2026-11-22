#!/usr/bin/env node
// Market v2, B5: public pages for the APIs in the LicenRoute Market, generated from its catalogue.
//   node scripts/build-apis.mjs --catalog <file or URL of catalog.json> [--date YYYY-MM-DD] [--out .] [--allow-http]
// Writes apis/<slug>/index.html in the listing's own language (catalog `language`: en or es, default es), with
// schema.org WebAPI data; two indexes, apis/ (English) and es/apis/ (Spanish), linked as language alternates; and the
// APIs blocks of sitemap.xml and llms.txt (between markers). Removes pages it generated before for APIs no longer in
// the catalogue. Run by hand before each publication (no CI). Only https links unless --allow-http (local tests).
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const SITE = "https://licenroute.com";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CSS = "/styles.css?v=202611221500";

// Every visible word of the page chrome, per language. The listing's own texts are shown as written.
export const STR = {
  en: {
    locale: "en-US", skip: "Skip to content", home: "/", homeLabel: "LicenRoute home", nav: "Main", footer: "Footer",
    apis: "APIs", apisPath: "/apis/", manual: "Manual", manualPath: "/manual/", guides: "Guides", publish: "Publish your API",
    legal: "The paid lane for your API. Test-mode prices: no real money is charged.",
    publishedBy: (p, n) => `Published by ${p} · ${n} requests served in the last 30 days`, example: "Example", request: "Request", response: "Response",
    plans: "Plans", noPlans: "No plans available right now.", free: "Free", requests: (n) => `${n} requests`, days: (n) => `${n} days`,
    trial: (n) => `free trial of ${n} requests`, ctaTrial: "Try it free", ctaBuy: "Buy", ctaRequest: "Request access",
    docs: "Documentation", status: "Service status", market: "Listing in the Market",
    testNote: "Test-mode prices: payment runs on Stripe in test mode and no real money is charged. You get the key when the payment completes or when you start the trial.",
    indexTitle: "APIs with a free trial", indexLead: "APIs you can try for free and buy in a minute. Each one charges with LicenRoute; the money goes straight to whoever publishes it.",
    indexDescription: "APIs you can try for free and buy in a minute, published in the LicenRoute Market.", empty: "APIs coming soon.", other: "en español",
    switchLabel: "Español", switchPath: "/es/apis/", switchLang: "es"
  },
  es: {
    locale: "es-ES", skip: "Saltar al contenido", home: "/es/", homeLabel: "LicenRoute, inicio", nav: "Principal", footer: "Pie",
    apis: "APIs", apisPath: "/es/apis/", manual: "Manual", manualPath: "/es/manual/", guides: "Guías", publish: "Publica tu API",
    legal: "El carril de pago de tu API. Precios en modo de pruebas: no se cobra dinero real.",
    publishedBy: (p, n) => `Publicada por ${p} · ${n} peticiones servidas en los últimos 30 días`, example: "Ejemplo", request: "Petición", response: "Respuesta",
    plans: "Planes", noPlans: "Sin planes disponibles ahora mismo.", free: "Sin coste", requests: (n) => `${n} peticiones`, days: (n) => `${n} días`,
    trial: (n) => `prueba gratis de ${n} peticiones`, ctaTrial: "Probar gratis", ctaBuy: "Comprar", ctaRequest: "Solicitar acceso",
    docs: "Documentación", status: "Estado del servicio", market: "Ficha en el Market",
    testNote: "Precios en modo de pruebas: el pago se hace con Stripe en modo test y no se cobra dinero real. La clave llega al terminar el pago o al activar la prueba.",
    indexTitle: "APIs con prueba gratis", indexLead: "APIs que puedes probar gratis y comprar en un minuto. Cada una cobra con LicenRoute; el dinero va directo a quien la publica.",
    indexDescription: "APIs que puedes probar gratis y comprar en un minuto, publicadas en el Market de LicenRoute.", empty: "Pronto habrá APIs aquí.", other: "in English",
    switchLabel: "English", switchPath: "/apis/", switchLang: "en"
  }
};

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
// JSON inside <script>: no "</" sequence can close the tag.
const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const money = (minor, cur, t) => (minor == null ? null : new Intl.NumberFormat(t.locale, { style: "currency", currency: cur }).format(minor / 100));
const num = (n, t) => Number(n ?? 0).toLocaleString(t.locale);
export const langOf = (l) => (l.language === "en" ? "en" : "es");

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

function page({ lang, title, description, canonical, alternates = [], body, jsonld }) {
  const t = STR[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${alternates.map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${esc(href)}">`).join("\n")}${alternates.length ? "\n" : ""}<link rel="icon" href="/favicon.ico" sizes="48x48">
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
<meta property="og:locale" content="${lang === "en" ? "en_US" : "es_ES"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${CSS}">
<script type="application/ld+json">${ld(jsonld)}</script>
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${t.home}" aria-label="${esc(t.homeLabel)}"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
    <nav class="top" aria-label="${esc(t.nav)}">
      <a href="${t.apisPath}">${esc(t.apis)}</a>
      <a class="opt" href="${t.manualPath}">${esc(t.manual)}</a>
      <a class="opt" href="https://github.com/licenroute/licenroute">GitHub</a>
      <a href="${t.switchPath}" hreflang="${t.switchLang}" lang="${t.switchLang}">${esc(t.switchLabel)}</a>
    </nav>
  </div>
</header>

<main id="main" class="prose">
${body}
</main>

<footer class="site">
  <div class="wrap">
    <div>
      <a class="brand" href="${t.home}"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
      <p class="legal">${esc(t.legal)}</p>
    </div>
    <nav aria-label="${esc(t.footer)}">
      <a href="${t.apisPath}">${esc(t.apis)}</a>
      <a href="${t.home}">${esc(t.publish)}</a>
      <a href="${t.manualPath}">${esc(t.manual)}</a>
      <a href="/llms.txt">llms.txt</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

export function apiPage(l) {
  const lang = langOf(l), t = STR[lang];
  const canonical = `${SITE}/apis/${l.slug}/`;
  const plans = l.plans ?? [];
  const primary = plans.find((p) => p.trial_units != null) ?? plans.find((p) => p.access === "instant") ?? plans[0];
  const planHtml = plans.map((p) => {
    const price = money(p.price_minor, p.currency, t);
    const facts = [p.quota_units != null ? t.requests(num(p.quota_units, t)) : null, p.duration_days ? t.days(p.duration_days) : null,
      p.trial_units != null ? t.trial(num(p.trial_units, t)) : null].filter(Boolean).join(" · ");
    const cta = p.trial_units != null ? t.ctaTrial : p.access === "instant" ? t.ctaBuy : t.ctaRequest;
    return `  <section class="plan" aria-labelledby="plan-${esc(p.id)}">
    <h3 id="plan-${esc(p.id)}">${esc(p.name)}</h3>
    <p><strong>${esc(price ?? t.free)}</strong>${facts ? ` · ${esc(facts)}` : ""}</p>
    <p><a class="btn ${p === primary ? "btn-primary" : "btn-quiet"}" href="${esc(p.purchase_url)}" rel="nofollow">${esc(cta)}</a></p>
  </section>`;
  }).join("\n");
  const example = l.example ? `  <h2>${esc(t.example)}</h2>
${l.example.request ? `  <p class="meta">${esc(t.request)}</p>\n  <pre class="block">${esc(l.example.request)}</pre>` : ""}
${l.example.response ? `  <p class="meta">${esc(t.response)}</p>\n  <pre class="block">${esc(l.example.response)}</pre>` : ""}` : "";
  const links = [l.docs_url ? `<a href="${esc(l.docs_url)}" rel="nofollow noopener">${esc(t.docs)}</a>` : null,
    l.status_url ? `<a href="${esc(l.status_url)}" rel="nofollow noopener">${esc(t.status)}</a>` : null,
    `<a href="${esc(l.url)}" rel="nofollow">${esc(t.market)}</a>`].filter(Boolean).join(" · ");
  const body = `  <p class="meta"><a href="${t.apisPath}">${esc(t.apis)}</a> · ${esc(l.category)}</p>
  <h1>${esc(l.title)}</h1>
  <p class="lead">${esc(l.summary)}</p>
  <p class="meta">${esc(t.publishedBy(l.publisher, num(l.served_last_30_days, t)))}</p>
${l.description ? l.description.split(/\n{2,}/).map((para) => `  <p>${esc(para).replace(/\n/g, "<br>")}</p>`).join("\n") : ""}
${example}
  <h2>${esc(t.plans)}</h2>
${planHtml || `  <p>${esc(t.noPlans)}</p>`}
  <p class="meta">${links}</p>
  <p class="meta">${esc(t.testNote)}</p>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "WebAPI", name: l.title, description: l.summary, url: canonical, inLanguage: lang,
    ...(l.docs_url ? { documentation: l.docs_url } : {}), provider: { "@type": "Organization", name: l.publisher },
    offers: plans.filter((p) => p.price_minor != null).map((p) => ({ "@type": "Offer", name: p.name, price: (p.price_minor / 100).toFixed(2), priceCurrency: p.currency, url: p.purchase_url }))
  };
  return page({ lang, title: `${l.title}: API | LicenRoute`, description: l.summary, canonical, body, jsonld });
}

// Both indexes list every API; an item written in the other language says so and carries its lang attribute.
export function indexPage(listings, lang) {
  const t = STR[lang];
  const canonical = `${SITE}${t.apisPath}`;
  const items = listings.map((l) => {
    const other = langOf(l) !== lang;
    return `    <li${other ? ` lang="${langOf(l)}"` : ""}><a href="/apis/${esc(l.slug)}/"><strong>${esc(l.title)}</strong><span>${esc(l.summary)}${other ? ` <em lang="${lang}">(${esc(t.other)})</em>` : ""}</span></a></li>`;
  }).join("\n");
  const body = `  <h1>${esc(t.indexTitle)}</h1>
  <p class="lead">${esc(t.indexLead)}</p>
  <ul class="guide-list">
${items || `    <li>${esc(t.empty)}</li>`}
  </ul>
  <p><a class="btn btn-quiet" href="${t.home}">${esc(t.publish)}</a></p>`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: t.indexTitle, url: canonical, inLanguage: lang,
    hasPart: listings.map((l) => ({ "@type": "WebAPI", name: l.title, url: `${SITE}/apis/${l.slug}/`, inLanguage: langOf(l) })) };
  const alternates = [["en", `${SITE}/apis/`], ["es", `${SITE}/es/apis/`], ["x-default", `${SITE}/apis/`]];
  return page({ lang, title: `${t.indexTitle} | LicenRoute`, description: t.indexDescription, canonical, alternates, body, jsonld });
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
  writeFileSync(join(dir, "index.html"), indexPage(listings, "en"));
  mkdirSync(join(out, "es", "apis"), { recursive: true });
  writeFileSync(join(out, "es", "apis", "index.html"), indexPage(listings, "es"));
  writeFileSync(manifest, JSON.stringify({ generated_by: "scripts/build-apis.mjs", date, slugs: listings.map((l) => l.slug) }, null, 2) + "\n");

  const sitemapPath = join(out, "sitemap.xml");
  if (existsSync(sitemapPath)) {
    const alt = `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/apis/"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/apis/"/>\n`;
    const urls = [
      ...[`${SITE}/apis/`, `${SITE}/es/apis/`].map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${date}</lastmod>\n${alt}  </url>`),
      ...listings.map((l) => `  <url>\n    <loc>${SITE}/apis/${l.slug}/</loc>\n    <lastmod>${date}</lastmod>\n  </url>`)
    ].join("\n");
    writeFileSync(sitemapPath, replaceBlock(readFileSync(sitemapPath, "utf8"), "  <!-- apis:start -->", "  <!-- apis:end -->", urls, "</urlset>"));
  }
  const llmsPath = join(out, "llms.txt");
  if (existsSync(llmsPath)) {
    const lines = ["## APIs in the LicenRoute Market", "", "APIs that can be tried for free and bought in a minute (test mode prices). Index: https://licenroute.com/apis/ (Spanish: /es/apis/). Machine-readable catalogue: the Market's /market/catalog.json; MCP server: packages/market-mcp in the repository.", "",
      ...listings.map((l) => `- [${l.title}](${SITE}/apis/${l.slug}/)${langOf(l) === "es" ? " (in Spanish)" : ""}: ${l.summary}`)].join("\n");
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
