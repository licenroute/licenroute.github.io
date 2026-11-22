import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STR, build, esc, replaceBlock, validate } from "./build-apis.mjs";

const plan = (id, extra = {}) => ({ id, name: "Básico", kind: "paid", access: "instant", currency: "EUR", price_minor: 500, quota_units: 1000,
  duration_days: 30, trial_units: 50, trial_days: 7, test_mode: true, purchase_url: `https://market.example/market/r/lst_1#plan-${id}`, ...extra });
const listing = (slug, extra = {}) => ({ id: `lst_${slug}`, slug, title: "Festivos ES", summary: "Festivos de España por comunidad", description: "Línea 1\n\nLínea 2",
  publisher: "LicenRoute", category: "datos", host: "api.example", url: "https://market.example/market/r/lst_1", docs_url: "https://api.example/openapi.json",
  status_url: null, example: { request: "GET /v1/calendar", response: "{\"ok\":true}" }, served_last_30_days: 12345, plans: [plan("plan_1")], ...extra });
const catalog = (...listings) => ({ version: "licenroute.market.catalog/v1", listings });

function site() {
  const dir = mkdtempSync(join(tmpdir(), "lr-site-"));
  writeFileSync(join(dir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url>\n    <loc>https://licenroute.com/</loc>\n  </url>\n</urlset>\n`);
  writeFileSync(join(dir, "llms.txt"), "# LicenRoute\n\nIntro.\n");
  return dir;
}

test("writes one page per API with escaped text, schema.org WebAPI and offers", () => {
  const dir = site();
  const evil = listing("festivos-es", { title: "Festivos <script>alert(1)</script>", summary: "a \"b\" </script>" });
  assert.deepEqual(build({ catalog: catalog(evil), out: dir, date: "2026-11-22" }), ["festivos-es"]);
  const html = readFileSync(join(dir, "apis/festivos-es/index.html"), "utf8");
  assert.ok(html.includes("Festivos &lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert"));
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);
  assert.equal(ld["@type"], "WebAPI");
  assert.deepEqual(ld.offers[0], { "@type": "Offer", name: "Básico", price: "5.00", priceCurrency: "EUR", url: "https://market.example/market/r/lst_1#plan-plan_1" });
  assert.ok(html.includes("12.345 peticiones servidas"));
  assert.ok(html.includes("5,00\u00a0€"));
  assert.ok(html.includes('<html lang="es">') && html.includes("Probar gratis"));
  assert.ok(html.includes('class="btn btn-primary"'));
  assert.ok(html.includes("modo de pruebas"));
  assert.ok(readFileSync(join(dir, "apis/index.html"), "utf8").includes('href="/apis/festivos-es/"'));
  rmSync(dir, { recursive: true });
});

test("sitemap and llms.txt get a block between markers that is replaced, not duplicated", () => {
  const dir = site();
  build({ catalog: catalog(listing("festivos-es")), out: dir, date: "2026-11-22" });
  build({ catalog: catalog(listing("festivos-es"), listing("impuestos-es", { title: "Impuestos ES" })), out: dir, date: "2026-11-23" });
  const sm = readFileSync(join(dir, "sitemap.xml"), "utf8");
  assert.equal(sm.match(/apis:start/g).length, 1);
  assert.ok(sm.includes("<loc>https://licenroute.com/apis/impuestos-es/</loc>") && sm.includes("2026-11-23"));
  assert.ok(sm.includes("<loc>https://licenroute.com/es/apis/</loc>") && sm.includes('hreflang="es" href="https://licenroute.com/es/apis/"'));
  assert.ok(sm.trimEnd().endsWith("</urlset>"));
  const llms = readFileSync(join(dir, "llms.txt"), "utf8");
  assert.equal(llms.match(/## APIs in the LicenRoute Market/g).length, 1);
  assert.ok(llms.includes("(https://licenroute.com/apis/impuestos-es/)"));
  rmSync(dir, { recursive: true });
});

test("pages of APIs that left the catalogue are removed; nothing else is touched", () => {
  const dir = site();
  build({ catalog: catalog(listing("a-api"), listing("b-api")), out: dir, date: "2026-11-22" });
  writeFileSync(join(dir, "apis/keep.txt"), "x");
  build({ catalog: catalog(listing("b-api")), out: dir, date: "2026-11-22" });
  assert.equal(existsSync(join(dir, "apis/a-api")), false);
  assert.equal(existsSync(join(dir, "apis/b-api/index.html")), true);
  assert.equal(existsSync(join(dir, "apis/keep.txt")), true);
  rmSync(dir, { recursive: true });
});

test("validation: bad slugs, duplicates and non-https links are dropped; wrong format refused", () => {
  assert.throws(() => validate({ version: "x", listings: [] }), /catalog\/v1/);
  const kept = validate(catalog(listing("ok"), listing("Bad Slug"), listing("ok"), listing("http-api", { url: "http://market.example/x" }),
    listing("js-api", { plans: [plan("p", { purchase_url: "javascript:alert(1)" })] }), listing("docs", { docs_url: "javascript:x" })));
  assert.deepEqual(kept.map((l) => l.slug), ["ok", "docs"]);
  assert.equal(kept[1].docs_url, null);
  assert.equal(validate(catalog(listing("http-api", { url: "http://localhost:3000/x", plans: [] })), { allowHttp: true }).length, 1);
});

test("helpers", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(replaceBlock("a\nEND", "<!-- s -->", "<!-- e -->", "x", "END"), "a\n<!-- s -->\nx\n<!-- e -->\nEND");
});

test("each page in its listing's language; two indexes that link to each other", () => {
  const dir = site();
  const en = listing("holidays-api", { title: "Holidays API", summary: "Public holidays of 207 countries", language: "en",
    plans: [plan("plan_en", { currency: "USD", price_minor: 2000, quota_units: 10000 })] });
  build({ catalog: catalog(listing("festivos-es"), en), out: dir, date: "2026-11-22" });
  const page = readFileSync(join(dir, "apis/holidays-api/index.html"), "utf8");
  assert.ok(page.includes('<html lang="en">'));
  for (const s of ["Try it free", "Plans", "$20.00", "10,000 requests", "Published by LicenRoute", "Test-mode prices", 'href="/es/apis/"']) assert.ok(page.includes(s), s);
  assert.ok(!page.includes("Probar gratis") && !page.includes("Planes"));
  assert.equal(JSON.parse(page.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]).inLanguage, "en");
  const enIndex = readFileSync(join(dir, "apis/index.html"), "utf8");
  const esIndex = readFileSync(join(dir, "es/apis/index.html"), "utf8");
  assert.ok(enIndex.includes('<html lang="en">') && enIndex.includes(STR.en.indexTitle) && enIndex.includes("(en español)"));
  assert.ok(esIndex.includes('<html lang="es">') && esIndex.includes(STR.es.indexTitle) && esIndex.includes("(in English)"));
  for (const html of [enIndex, esIndex]) assert.ok(html.includes('hreflang="en" href="https://licenroute.com/apis/"') && html.includes('hreflang="es" href="https://licenroute.com/es/apis/"'));
  assert.ok(readFileSync(join(dir, "llms.txt"), "utf8").includes("[Festivos ES](https://licenroute.com/apis/festivos-es/) (in Spanish)"));
  rmSync(dir, { recursive: true });
});

test("singular for one request served", () => {
  const dir = site();
  build({ catalog: catalog(listing("one-es", { served_last_30_days: 1 }), listing("one-en", { language: "en", served_last_30_days: 1 })), out: dir, date: "2026-11-22" });
  assert.ok(readFileSync(join(dir, "apis/one-es/index.html"), "utf8").includes("1 petición servida en los últimos 30 días"));
  assert.ok(readFileSync(join(dir, "apis/one-en/index.html"), "utf8").includes("1 request served in the last 30 days"));
  rmSync(dir, { recursive: true });
});
