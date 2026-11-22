#!/usr/bin/env node
// Public holiday pages, generated from the same data as the Holidays API (date-holidays 3.38.0, data CC BY-SA 4.0).
//   node scripts/build-holidays.mjs [--out .] [--years 2026,2027] [--date YYYY-MM-DD]
// English: holidays/<country>/<year>/ for every country, plus holidays/ (index).
// Spanish: es/festivos/<país>/<año>/ for Spain, its 19 regions (es/festivos/espana/<región>/<año>/, with the BOE rule:
// holidays on a Sunday are not listed) and the Spanish-speaking countries of the Americas, plus es/festivos/ (index).
// Each page: the holidays, long weekends and bridges, business days per month (only where the weekend is Saturday and
// Sunday), the regions with extra holidays, the source and licence, and a link to the API's free trial.
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import Holidays from "date-holidays";

const SITE = "https://licenroute.com";
const CSS = "/styles.css?v=202611222300";
// Countries whose weekend is not Saturday–Sunday: no business-day table for them (we would get it wrong).
const NOT_SAT_SUN = new Set(["AF", "BD", "BH", "DZ", "EG", "IL", "IQ", "IR", "JO", "KW", "LY", "MV", "NP", "OM", "QA", "SA", "SD", "SY", "YE"]);
const LATAM = ["AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "MX", "NI", "PA", "PE", "PR", "PY", "SV", "UY", "VE"];
export const ES_REGIONS = { AN: "Andalucía", AR: "Aragón", AS: "Asturias", CB: "Cantabria", CE: "Ceuta", CL: "Castilla y León",
  CM: "Castilla-La Mancha", CN: "Canarias", CT: "Cataluña", EX: "Extremadura", GA: "Galicia", IB: "Illes Balears",
  MC: "Región de Murcia", MD: "Comunidad de Madrid", ML: "Melilla", NC: "Navarra", PV: "País Vasco", RI: "La Rioja", VC: "Comunitat Valenciana" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
export const slug = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dow = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

const T = {
  en: {
    locale: "en-GB", home: "/", apisPath: "/apis/", indexPath: "/holidays/", manualPath: "/manual/", nav: "Main", footer: "Footer", skip: "Skip to content",
    apis: "APIs", index: "Holidays", manual: "Manual", publish: "Publish your API",
    legal: "The paid lane for your API. Hosted pilot: real payments by Bizum or bank transfer.",
    title: (place, y) => `Public holidays in ${place} ${y}`,
    lead: (place, y, n, first, last) => `${place} has ${n} ${n === 1 ? "public holiday" : "public holidays"} in ${y}, from ${first} to ${last}.`,
    cols: ["Date", "Day", "Holiday"], substitute: "substitute day",
    long: "Long weekends and bridges", none: "No long weekends from public holidays this year.",
    threeDay: (d, n) => `${d}: ${n}, a three-day weekend.`, bridge: (d, n, w) => `${d}: ${n} is on a ${w}; take one day off for a four-day weekend.`,
    business: "Business days per month", businessNote: "Monday to Friday, minus the public holidays that fall on a weekday.",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], total: "Total",
    regions: (n) => `${n} regions have extra holidays of their own`, regionsNote: "This page lists the national holidays. The Holidays API returns each region's list with ?region=.",
    years: "Other years", otherLang: "En español",
    cta: "Need these dates in your app?", ctaText: "The Holidays API returns the holidays of 207 countries and their regions, and counts business days between two dates.", ctaBtn: "Try it free: 100 requests",
    source: "Data: date-holidays (CC BY-SA 4.0), the same source as the Holidays API; this page's data is shared under the same licence. Local holidays may be missing: for legal deadlines, check the official source.",
    indexTitle: "Public holidays by country", indexLead: "Public holidays of 207 countries for 2026 and 2027, with long weekends and business days per month.",
    indexDescription: "Public holidays of 207 countries for 2026 and 2027, with long weekends, bridges and business days per month.",
    dowName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  },
  es: {
    locale: "es-ES", home: "/es/", apisPath: "/es/apis/", indexPath: "/es/festivos/", manualPath: "/es/manual/", nav: "Principal", footer: "Pie", skip: "Saltar al contenido",
    apis: "APIs", index: "Festivos", manual: "Manual", publish: "Publica tu API",
    legal: "El carril de pago de tu API. Piloto alojado: cobros reales por Bizum o transferencia.",
    title: (place, y, spain) => spain ? `Festivos en ${place} ${y}` : `Feriados y días festivos en ${place} ${y}`,
    lead: (place, y, n, first, last) => `${place} tiene ${n} ${n === 1 ? "festivo" : "festivos"} en ${y}, del ${first} al ${last}.`,
    cols: ["Fecha", "Día", "Festivo"], substitute: "sustitutorio",
    long: "Puentes y fines de semana largos", none: "Este año no hay fines de semana largos por festivos.",
    threeDay: (d, n) => `${d}: ${n}, fin de semana de tres días.`, bridge: (d, n, w) => `${d}: ${n} cae en ${w}; con un día libre, puente de cuatro días.`,
    business: "Días laborables por mes", businessNote: "De lunes a viernes, sin contar los festivos que caen entre semana.",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], total: "Total",
    regions: (n) => `${n} regiones tienen festivos propios`, regionsNote: "Esta página recoge los festivos nacionales. La API devuelve los de cada región con ?region=.",
    years: "Otros años", otherLang: "In English",
    cta: "¿Necesitas estas fechas en tu aplicación?", ctaText: "La API de festivos devuelve los festivos de 207 países y sus regiones, y cuenta los días laborables entre dos fechas.", ctaBtn: "Pruébala gratis: 100 peticiones",
    source: "Datos: date-holidays (CC BY-SA 4.0), la misma fuente que la API; los datos de esta página se comparten con la misma licencia. Pueden faltar festivos locales: para plazos legales, consulta la fuente oficial (en España, el BOE y los boletines autonómicos).",
    indexTitle: "Festivos por país y comunidad", indexLead: "Festivos de 2026 y 2027 en España, sus 19 comunidades y Latinoamérica, con puentes y días laborables por mes.",
    indexDescription: "Festivos de 2026 y 2027 en España, sus 19 comunidades autónomas y Latinoamérica, con puentes y días laborables por mes.",
    dowName: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
  }
};

const fmt = (iso, t) => new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** Public holidays of a place and year: [{date, name, substitute}], one row per holiday. Spain uses the BOE rule. */
export function listHolidays(country, year, { region, lang = "en" } = {}) {
  const hd = region ? new Holidays(country, region) : new Holidays(country);
  let list = hd.getHolidays(Number(year), lang).filter((h) => h.type === "public")
    .map((h) => ({ date: h.date.slice(0, 10), name: h.name, substitute: h.substitute === true }));
  if (country === "ES") list = list.filter((h) => dow(h.date) !== 0); // BOE: Sunday holidays are not listed
  // The source can list a moved holiday twice on the same day ("X" and "X (substitute day)"): one row, flagged.
  const base = (n) => n.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
  const rows = new Map();
  for (const h of list) {
    const k = `${h.date}|${base(h.name)}`, prev = rows.get(k);
    if (!prev) rows.set(k, { ...h, name: h.name.replace(/\s*\((?:substitute day|día sustituto|observed)\)\s*$/i, "") });
    else prev.substitute = prev.substitute || h.substitute;
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function longWeekends(list) {
  const out = [];
  for (const date of [...new Set(list.map((h) => h.date))]) {
    const d = dow(date), name = list.filter((h) => h.date === date).map((h) => h.name).join(" / ");
    if (d === 1 || d === 5) out.push({ date, name, kind: "three" });
    else if (d === 2 || d === 4) out.push({ date, name, kind: "bridge", weekday: d });
  }
  return out;
}

export function businessDays(year, list) {
  const off = new Set(list.map((h) => h.date));
  return Array.from({ length: 12 }, (_, m) => {
    let n = 0;
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(Date.UTC(year, m, day));
      if (dt.getUTCMonth() !== m) break;
      const iso = dt.toISOString().slice(0, 10), w = dt.getUTCDay();
      if (w !== 0 && w !== 6 && !off.has(iso)) n++;
    }
    return n;
  });
}

function page({ lang, title, description, canonical, alternates, body, jsonld, switchHref }) {
  const t = T[lang];
  const other = lang === "en" ? "es" : "en";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${alternates.map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${href}">`).join("\n")}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f2a516">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:locale" content="${lang === "en" ? "en_GB" : "es_ES"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${CSS}">
<script type="application/ld+json">${ld(jsonld)}</script>
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${t.home}" aria-label="LicenRoute"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
    <nav class="top" aria-label="${esc(t.nav)}">
      <a href="${t.indexPath}">${esc(t.index)}</a>
      <a href="${t.apisPath}">${esc(t.apis)}</a>
      <a class="opt" href="${t.manualPath}">${esc(t.manual)}</a>
      ${switchHref ? `<a href="${switchHref}" hreflang="${other}" lang="${other}">${other === "es" ? "Español" : "English"}</a>` : ""}
    </nav>
  </div>
</header>

<main id="main" class="prose holidays">
${body}
</main>

<footer class="site">
  <div class="wrap">
    <div>
      <a class="brand" href="${t.home}"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
      <p class="legal">${esc(t.legal)}</p>
    </div>
    <nav aria-label="${esc(t.footer)}">
      <a href="${t.indexPath}">${esc(t.index)}</a>
      <a href="${t.apisPath}">${esc(t.apis)}</a>
      <a href="${t.home}">${esc(t.publish)}</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

function holidayPage({ lang, country, place, year, years, list, regions, path, apiSlug, alternates, switchHref, yearHref, spain, breadcrumb }) {
  const t = T[lang];
  const canonical = `${SITE}${path}`;
  const title = t.title(place, year, spain);
  const rows = list.map((h) => `      <tr><td>${esc(fmt(h.date, t))}</td><td>${esc(t.dowName[dow(h.date)])}</td><td>${esc(h.name)}${h.substitute ? ` <span class="meta">(${esc(t.substitute)})</span>` : ""}</td></tr>`).join("\n");
  const lw = longWeekends(list);
  const lwHtml = lw.length ? `  <ul>\n${lw.map((x) => `    <li>${esc(x.kind === "three" ? t.threeDay(fmt(x.date, t), x.name) : t.bridge(fmt(x.date, t), x.name, t.dowName[x.weekday]))}</li>`).join("\n")}\n  </ul>` : `  <p>${esc(t.none)}</p>`;
  const bd = NOT_SAT_SUN.has(country) ? null : businessDays(Number(year), list);
  const bdHtml = bd ? `  <h2>${esc(t.business)}</h2>
  <p class="meta">${esc(t.businessNote)}</p>
  <div class="table-wrap"><table class="months">
    <thead><tr>${t.months.map((m) => `<th scope="col">${m}</th>`).join("")}<th scope="col">${esc(t.total)}</th></tr></thead>
    <tbody><tr>${bd.map((n) => `<td>${n}</td>`).join("")}<td><strong>${bd.reduce((a, b) => a + b, 0)}</strong></td></tr></tbody>
  </table></div>` : "";
  const regHtml = regions?.length ? `  <h2>${esc(t.regions(regions.length))}</h2>
  <p>${regions.map((r) => r.href ? `<a href="${r.href}">${esc(r.name)}</a>` : esc(r.name)).join(" · ")}</p>
  <p class="meta">${esc(t.regionsNote)}</p>` : "";
  const yearsHtml = `  <p class="meta">${esc(t.years)}: ${years.filter((y) => y !== year).map((y) => `<a href="${yearHref(y)}">${y}</a>`).join(" · ")}</p>`;
  const body = `  <p class="meta"><a href="${t.indexPath}">${esc(t.index)}</a>${breadcrumb ? ` · ${breadcrumb}` : ""}</p>
  <h1>${esc(title)}</h1>
  <p class="lead">${esc(t.lead(place, year, new Set(list.map((h) => h.date)).size, fmt(list[0].date, t), fmt(list.at(-1).date, t)))}</p>
  <div class="table-wrap"><table>
    <thead><tr>${t.cols.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table></div>
  <h2>${esc(t.long)}</h2>
${lwHtml}
${bdHtml}
${regHtml}
  <section class="plan cta">
    <h3>${esc(t.cta)}</h3>
    <p>${esc(t.ctaText)}</p>
    <p><a class="btn btn-primary" href="/apis/${apiSlug}/">${esc(t.ctaBtn)}</a></p>
  </section>
${yearsHtml}
  <p class="meta">${esc(t.source)}</p>`;
  const jsonld = { "@context": "https://schema.org", "@type": "WebPage", name: title, url: canonical, inLanguage: lang,
    about: { "@type": "Place", name: place }, isPartOf: { "@type": "WebSite", name: "LicenRoute", url: SITE },
    mainEntity: { "@type": "ItemList", name: title, numberOfItems: list.length,
      itemListElement: list.map((h, i) => ({ "@type": "ListItem", position: i + 1, name: `${h.name} (${h.date})` })) } };
  return page({ lang, title: `${title} | LicenRoute`, description: t.lead(place, year, new Set(list.map((h) => h.date)).size, fmt(list[0].date, t), fmt(list.at(-1).date, t)), canonical, alternates, body, jsonld, switchHref });
}

function indexPage(lang, groups, alternates, switchHref) {
  const t = T[lang];
  const body = `  <h1>${esc(t.indexTitle)}</h1>
  <p class="lead">${esc(t.indexLead)}</p>
${groups.map((g) => `${g.title ? `  <h2>${esc(g.title)}</h2>\n` : ""}  <ul class="country-list">
${g.items.map((i) => `    <li><span>${esc(i.name)}</span> ${i.years.map(([y, href]) => `<a href="${href}">${y}</a>`).join(" ")}</li>`).join("\n")}
  </ul>`).join("\n")}
  <section class="plan cta">
    <h3>${esc(t.cta)}</h3>
    <p>${esc(t.ctaText)}</p>
    <p><a class="btn btn-primary" href="/apis/${lang === "en" ? "holidays-api" : "festivos-es"}/">${esc(t.ctaBtn)}</a></p>
  </section>
  <p class="meta">${esc(t.source)}</p>`;
  return page({ lang, title: `${t.indexTitle} | LicenRoute`, description: t.indexDescription, canonical: `${SITE}${t.indexPath}`, alternates, body,
    jsonld: { "@context": "https://schema.org", "@type": "CollectionPage", name: t.indexTitle, url: `${SITE}${t.indexPath}`, inLanguage: lang }, switchHref });
}

function replaceBlock(text, start, end, block, anchor) {
  const i = text.indexOf(start), j = text.indexOf(end);
  const full = `${start}\n${block}\n${end}`;
  if (i !== -1 && j > i) return text.slice(0, i) + full + text.slice(j + end.length);
  const k = anchor ? text.lastIndexOf(anchor) : -1;
  return k === -1 ? `${text.trimEnd()}\n${full}\n` : `${text.slice(0, k)}${full}\n${text.slice(k)}`;
}

export function build({ out, years, date }) {
  const index = new Holidays();
  const namesEn = index.getCountries("en"), namesEs = index.getCountries("es");
  const countries = Object.keys(namesEn).sort((a, b) => namesEn[a].localeCompare(namesEn[b], "en"));
  const enSlug = Object.fromEntries(countries.map((c) => [c, slug(namesEn[c])]));
  const esCountries = ["ES", ...LATAM.filter((c) => namesEn[c])];
  const esSlug = Object.fromEntries(esCountries.map((c) => [c, slug(namesEs[c] ?? namesEn[c])]));
  const urls = [];
  const write = (path, html) => { const dir = join(out, path); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "index.html"), html); urls.push(`${SITE}${path}`); };
  for (const d of ["holidays", join("es", "festivos")]) rmSync(join(out, d), { recursive: true, force: true });

  for (const c of countries) for (const y of years) {
    const list = listHolidays(c, y, { lang: "en" });
    if (!list.length) continue;
    const path = `/holidays/${enSlug[c]}/${y}/`, esPath = esSlug[c] ? `/es/festivos/${esSlug[c]}/${y}/` : null;
    const alternates = [["en", `${SITE}${path}`], ...(esPath ? [["es", `${SITE}${esPath}`]] : []), ["x-default", `${SITE}${path}`]];
    const regs = Object.values(index.getStates(c) ?? {}).map((name) => ({ name }));
    write(path, holidayPage({ lang: "en", country: c, place: namesEn[c], year: y, years, list, regions: c === "ES" ? Object.values(ES_REGIONS).map((n, i) => ({ name: n, href: `/es/festivos/espana/${slug(n)}/${y}/` })) : regs,
      path, apiSlug: "holidays-api", alternates, switchHref: esPath, yearHref: (yy) => `/holidays/${enSlug[c]}/${yy}/`, spain: false }));
  }
  for (const c of esCountries) for (const y of years) {
    const list = listHolidays(c, y, { lang: "es" });
    if (!list.length) continue;
    const place = namesEs[c] ?? namesEn[c];
    const path = `/es/festivos/${esSlug[c]}/${y}/`, enPath = `/holidays/${enSlug[c]}/${y}/`;
    const alternates = [["es", `${SITE}${path}`], ["en", `${SITE}${enPath}`], ["x-default", `${SITE}${enPath}`]];
    const regs = c === "ES" ? Object.entries(ES_REGIONS).map(([, n]) => ({ name: n, href: `/es/festivos/espana/${slug(n)}/${y}/` }))
      : Object.values(index.getStates(c) ?? {}).map((name) => ({ name }));
    write(path, holidayPage({ lang: "es", country: c, place, year: y, years, list, regions: regs, path, apiSlug: c === "ES" ? "festivos-es" : "holidays-api",
      alternates, switchHref: enPath, yearHref: (yy) => `/es/festivos/${esSlug[c]}/${yy}/`, spain: c === "ES" }));
  }
  for (const [code, name] of Object.entries(ES_REGIONS)) for (const y of years) {
    const list = listHolidays("ES", y, { region: code, lang: "es" });
    if (!list.length) continue;
    const path = `/es/festivos/espana/${slug(name)}/${y}/`;
    write(path, holidayPage({ lang: "es", country: "ES", place: name, year: y, years, list, regions: null, path, apiSlug: "festivos-es",
      alternates: [["es", `${SITE}${path}`]], switchHref: null, yearHref: (yy) => `/es/festivos/espana/${slug(name)}/${yy}/`, spain: true,
      breadcrumb: `<a href="/es/festivos/espana/${y}/">España</a>` }));
  }
  const enItems = countries.map((c) => ({ name: namesEn[c], years: years.map((y) => [y, `/holidays/${enSlug[c]}/${y}/`]) }));
  write("/holidays/", indexPage("en", [{ items: enItems }], [["en", `${SITE}/holidays/`], ["es", `${SITE}/es/festivos/`], ["x-default", `${SITE}/holidays/`]], "/es/festivos/"));
  const esGroups = [
    { title: "España", items: [{ name: "España (nacionales)", years: years.map((y) => [y, `/es/festivos/espana/${y}/`]) },
      ...Object.values(ES_REGIONS).map((n) => ({ name: n, years: years.map((y) => [y, `/es/festivos/espana/${slug(n)}/${y}/`]) }))] },
    { title: "Latinoamérica", items: LATAM.filter((c) => esSlug[c]).map((c) => ({ name: namesEs[c] ?? namesEn[c], years: years.map((y) => [y, `/es/festivos/${esSlug[c]}/${y}/`]) }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")) }
  ];
  write("/es/festivos/", indexPage("es", esGroups, [["es", `${SITE}/es/festivos/`], ["en", `${SITE}/holidays/`], ["x-default", `${SITE}/holidays/`]], "/holidays/"));

  const sitemap = join(out, "sitemap.xml");
  if (existsSync(sitemap)) {
    const block = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`).join("\n");
    writeFileSync(sitemap, replaceBlock(readFileSync(sitemap, "utf8"), "  <!-- holidays:start -->", "  <!-- holidays:end -->", block, "</urlset>"));
  }
  const llms = join(out, "llms.txt");
  if (existsSync(llms)) {
    writeFileSync(llms, replaceBlock(readFileSync(llms, "utf8"), "<!-- holidays:start -->", "<!-- holidays:end -->",
      `## Public holiday pages\n\nPublic holidays of 207 countries for ${years.join(" and ")}, with long weekends and business days per month: ${SITE}/holidays/ (Spanish, with Spain's 19 regions and Latin America: ${SITE}/es/festivos/). Same data as the Holidays API (date-holidays, CC BY-SA 4.0).`));
  }
  return urls.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { out: { type: "string", default: "." }, years: { type: "string", default: "2026,2027" }, date: { type: "string" } } });
  const n = build({ out: values.out, years: values.years.split(",").map(Number), date: values.date ?? new Date().toISOString().slice(0, 10) });
  console.log(`${n} holiday pages written`);
}
