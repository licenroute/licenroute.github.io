#!/usr/bin/env node
// Free browser tools (Spanish and English): IVA/IRPF invoice calculator, amount in Spanish words, NIF/NIE/CIF/IBAN
// validator. The logic is the APIs' own code copied to tools/lib/ (refreshed here from ../licenroute-apis when present).
//   node scripts/build-tools.mjs [--out .] [--date YYYY-MM-DD]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const SITE = "https://licenroute.com";
const CSS = "/styles.css?v=202611222300";
const LIBS = [["validaciones-es", "validators.js"], ["impuestos-es", "tax.js"], ["formatos-es", "formats.js"]];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const C = {
  es: { home: "/es/", index: "/es/herramientas/", indexName: "Herramientas", apis: "/es/apis/", fest: "/es/festivos/", festName: "Festivos", nav: "Principal", footer: "Pie", skip: "Saltar al contenido",
    legal: "El carril de pago de tu API. Piloto alojado: aún sin cobros reales.", publish: "Publica tu API",
    privacy: "Se calcula en tu navegador con el mismo código que la API: lo que escribes no se envía a ningún sitio.",
    noscript: "Esta herramienta necesita JavaScript.", ctaBtn: "Pruébala gratis: 100 peticiones", other: "In English",
    indexTitle: "Herramientas gratis para facturas y datos de España", indexLead: "Calculadora de IVA e IRPF, importes en letras y validador de NIF, NIE, CIF e IBAN. Gratis, sin registro y sin enviar tus datos." },
  en: { home: "/", index: "/tools/", indexName: "Tools", apis: "/apis/", fest: "/holidays/", festName: "Public holidays", nav: "Main", footer: "Footer", skip: "Skip to content",
    legal: "The paid lane for your API. Hosted pilot: no real charges yet.", publish: "Publish your API",
    privacy: "Calculated in your browser with the same code as the API: nothing you type is sent anywhere.",
    noscript: "This tool needs JavaScript.", ctaBtn: "Try it free: 100 requests", other: "En español",
    indexTitle: "Free tools for Spanish invoices and IDs", indexLead: "Spain IVA and IRPF calculator, amounts in Spanish words, and NIF, NIE, CIF and IBAN validator. Free, no sign-up, nothing sent anywhere." }
};

const TOOLS = [
  { key: "vat", api: "impuestos-es", es: "calculadora-iva-irpf", en: "spain-vat-irpf-calculator",
    t: { es: { title: "Calculadora de IVA e IRPF para facturas", desc: "Calcula el IVA, el recargo de equivalencia, la retención de IRPF y el total de una factura en España, desde la base o desde el total con IVA. Gratis y al céntimo.",
               lead: "IVA, recargo de equivalencia, retención de IRPF y total de una factura, al céntimo y con los tipos del BOE.",
               cta: "¿Facturas desde tu aplicación?", ctaText: "La API Impuestos ES hace este mismo cálculo en céntimos exactos.",
               about: ["**Tipos de IVA:** 21 % general, 10 % reducido, 4 % superreducido y 0 %. Elige el que corresponde a tu producto o servicio; la herramienta no lo decide por ti.",
                       "**Retención de IRPF** para profesionales: 15 % general y 7 % el año de inicio de actividad y los dos siguientes (Reglamento del IRPF, art. 95).",
                       "**Recargo de equivalencia** (comercio minorista): 5,2 % con IVA del 21, 1,4 % con el 10 y 0,5 % con el 4.",
                       "Vale para la Península y Baleares. Canarias (IGIC), Ceuta y Melilla (IPSI) tienen su propio impuesto. No es asesoramiento fiscal."] },
         en: { title: "Spain VAT (IVA) and IRPF calculator for invoices", desc: "Work out IVA, recargo de equivalencia, IRPF withholding and the total of a Spanish invoice, from the base or from a total with IVA. Free, to the cent.",
               lead: "IVA, recargo de equivalencia, IRPF withholding and invoice total for Spain, to the cent, with the BOE rates.",
               cta: "Invoicing from your app?", ctaText: "The Impuestos ES API does this same calculation in exact cents.",
               about: ["**IVA rates:** 21% standard, 10% reduced, 4% super-reduced and 0%. Choose the one that applies to what you sell; the tool does not decide it for you.",
                       "**IRPF withholding** for freelancers (autónomos): 15% standard and 7% in the year you start and the next two (IRPF Regulation, art. 95).",
                       "**Recargo de equivalencia** (retailers): 5.2% with 21% IVA, 1.4% with 10% and 0.5% with 4%.",
                       "Valid for mainland Spain and the Balearic Islands. The Canary Islands (IGIC), Ceuta and Melilla (IPSI) have their own tax. Not tax advice."] } },
    form: (l) => `<form id="tool-vat" class="tool" novalidate>
    <div class="grid2">
      <label>${l === "es" ? "Importe" : "Amount"}<input id="vat-amount" inputmode="decimal" autocomplete="off" placeholder="1000" value="1000"></label>
      <label>${l === "es" ? "Es…" : "It is…"}<select id="vat-mode"><option value="base">${l === "es" ? "la base (sin IVA)" : "the base (without IVA)"}</option><option value="total">${l === "es" ? "el total con IVA" : "the total with IVA"}</option></select></label>
      <label>IVA<select id="vat-iva"><option value="21">21 %</option><option value="10">10 %</option><option value="4">4 %</option><option value="0">0 %</option></select></label>
    </div>
    <div id="vat-extra" class="grid2">
      <label>${l === "es" ? "Retención de IRPF" : "IRPF withholding"}<select id="vat-irpf"><option value="0">${l === "es" ? "Sin retención" : "None"}</option><option value="15">15 %</option><option value="7">7 %</option></select></label>
      <label class="check"><input type="checkbox" id="vat-recargo"> ${l === "es" ? "Recargo de equivalencia" : "Recargo de equivalencia"}</label>
    </div>
    <button class="btn btn-primary" type="submit">${l === "es" ? "Calcular" : "Calculate"}</button>
  </form>
  <div id="vat-out" class="tool-out" aria-live="polite" hidden></div>` },
  { key: "words", api: "formatos-es", es: "importe-en-letras", en: "spanish-amount-in-words",
    t: { es: { title: "Importe en letras para cheques y facturas", desc: "Convierte un importe en euros a letras en español, con céntimos y en mayúsculas para cheques: mil doscientos treinta y cuatro euros con cincuenta y seis céntimos.",
               lead: "Escribe un importe y obtén el texto en letras, listo para un cheque, un pagaré o una factura.",
               cta: "¿Generas documentos automáticamente?", ctaText: "La API Formatos ES escribe importes en letras y lee importes y fechas a la española.",
               about: ["Sigue las reglas del español: «un euro», «veintiún euros», «un millón de euros» y «doscientos mil millones».",
                       "Acepta importes como 1234,56 o 1.234,56. Hasta 999.999.999.999,99 €.",
                       "Activa «mayúsculas» para cheques y pagarés."] },
         en: { title: "Amount in Spanish words for cheques and invoices", desc: "Turn a euro amount into Spanish words, with cents and in capitals for cheques: mil doscientos treinta y cuatro euros con cincuenta y seis céntimos.",
               lead: "Type an amount and get it written out in Spanish, ready for a cheque, promissory note or invoice.",
               cta: "Generating documents automatically?", ctaText: "The Formatos ES API writes amounts in Spanish words and reads Spanish-format amounts and dates.",
               about: ["Follows Spanish grammar: «un euro», «veintiún euros», «un millón de euros» and «doscientos mil millones».",
                       "Accepts amounts like 1234.56, 1234,56 or 1.234,56. Up to €999,999,999,999.99.",
                       "Turn on capitals for cheques and promissory notes."] } },
    form: (l) => `<form id="tool-words" class="tool" novalidate>
    <label>${l === "es" ? "Importe en euros" : "Amount in euros"}<input id="words-amount" inputmode="decimal" autocomplete="off" placeholder="1.234,56" value="1.234,56"></label>
    <label class="check"><input type="checkbox" id="words-upper"> ${l === "es" ? "En mayúsculas (cheques)" : "In capitals (cheques)"}</label>
    <button class="btn btn-primary" type="submit">${l === "es" ? "Convertir" : "Convert"}</button>
  </form>
  <div id="words-out" class="tool-out" aria-live="polite" hidden></div>` },
  { key: "ids", api: "validaciones-es", es: "validar-nif-nie-cif-iban", en: "spanish-nie-nif-iban-validator",
    t: { es: { title: "Validar NIF, NIE, CIF e IBAN", desc: "Comprueba si un NIF, NIE, CIF, IBAN o código postal español es correcto y por qué no lo es. Gratis, al momento y sin enviar el dato a ningún servidor.",
               lead: "Detecta el tipo de identificador, comprueba su letra o dígito de control y te dice qué falla.",
               cta: "¿Validas datos en formularios?", ctaText: "La API Validaciones ES comprueba NIF, NIE, CIF, IBAN y códigos postales con el motivo del error.",
               about: ["**NIF (DNI):** 8 cifras y la letra de control. **NIE:** X, Y o Z, 7 cifras y la letra.",
                       "**CIF** de empresas: letra, 7 cifras y el carácter de control (cifra o letra, según el tipo de entidad).",
                       "**IBAN** de cualquier país, con el dígito de control (módulo 97) y la longitud de los países más habituales.",
                       "Comprueba que el dato es coherente, no que exista ni a quién pertenece."] },
         en: { title: "Spanish NIE, NIF, CIF and IBAN validator", desc: "Check whether a Spanish NIE, NIF, CIF, IBAN or postal code is valid, and why not. Free, instant, and nothing is sent to any server.",
               lead: "Detects the type of identifier, checks its control letter or digit, and tells you what is wrong.",
               cta: "Validating form data?", ctaText: "The Validaciones ES API checks NIF, NIE, CIF, IBAN and postal codes, with the reason when one fails.",
               about: ["**NIE** (foreigner identity number): X, Y or Z, 7 digits and a control letter. **NIF (DNI):** 8 digits and the letter.",
                       "**CIF** (companies): a letter, 7 digits and a control character (digit or letter, depending on the entity).",
                       "**IBAN** of any country, with the check digits (mod 97) and the length for the most common countries.",
                       "It checks that the value is consistent, not that it exists or who owns it."] } },
    form: (l) => `<form id="tool-ids" class="tool" novalidate>
    <label>${l === "es" ? "NIF, NIE, CIF, IBAN o código postal" : "NIE, NIF, CIF, IBAN or postal code"}<input id="ids-value" autocomplete="off" spellcheck="false" placeholder="12345678Z" value="12345678Z"></label>
    <button class="btn btn-primary" type="submit">${l === "es" ? "Comprobar" : "Check"}</button>
  </form>
  <div id="ids-out" class="tool-out" aria-live="polite" hidden></div>` }
];

const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

function page({ lang, title, desc, path, altPath, body, jsonld }) {
  const c = C[lang], other = lang === "es" ? "en" : "es";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | LicenRoute</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" hreflang="${lang}" href="${SITE}${path}">
<link rel="alternate" hreflang="${other}" href="${SITE}${altPath}">
<link rel="alternate" hreflang="x-default" href="${SITE}${lang === "en" ? path : altPath}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f2a516">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${CSS}">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
</head>
<body>
<a class="skip" href="#main">${esc(c.skip)}</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${c.home}" aria-label="LicenRoute"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
    <nav class="top" aria-label="${esc(c.nav)}">
      <a href="${c.index}">${esc(c.indexName)}</a>
      <a href="${c.apis}">APIs</a>
      <a class="opt" href="${c.fest}">${esc(c.festName)}</a>
      <a href="${altPath}" hreflang="${other}" lang="${other}">${other === "es" ? "Español" : "English"}</a>
    </nav>
  </div>
</header>

<main id="main" class="prose tools">
${body}
</main>

<footer class="site">
  <div class="wrap">
    <div>
      <a class="brand" href="${c.home}"><img src="/mark.svg" alt="" width="34" height="34">LicenRoute</a>
      <p class="legal">${esc(c.legal)}</p>
    </div>
    <nav aria-label="${esc(c.footer)}">
      <a href="${c.index}">${esc(c.indexName)}</a>
      <a href="${c.apis}">APIs</a>
      <a href="${c.home}">${esc(c.publish)}</a>
    </nav>
  </div>
</footer>
<script type="module" src="/tools/tools.js?v=202611222300"></script>
</body>
</html>
`;
}

function replaceBlock(text, start, end, block, anchor) {
  const i = text.indexOf(start), j = text.indexOf(end);
  const full = `${start}\n${block}\n${end}`;
  if (i !== -1 && j > i) return text.slice(0, i) + full + text.slice(j + end.length);
  const k = anchor ? text.lastIndexOf(anchor) : -1;
  return k === -1 ? `${text.trimEnd()}\n${full}\n` : `${text.slice(0, k)}${full}\n${text.slice(k)}`;
}

// Short commit of a repository read from .git directly (no git binary needed: it may not run under every Node build).
function gitRev(repo) {
  try {
    const head = readFileSync(join(repo, ".git", "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) return head.slice(0, 7);
    const ref = head.slice(5);
    const loose = join(repo, ".git", ref);
    if (existsSync(loose)) return readFileSync(loose, "utf8").trim().slice(0, 7);
    const packed = readFileSync(join(repo, ".git", "packed-refs"), "utf8").split("\n").find((l) => l.endsWith(` ${ref}`));
    return packed ? packed.slice(0, 7) : "unknown";
  } catch { return "unknown"; }
}

// Refresh tools/lib/ from the APIs' source when the repositories are next to the site.
export function refreshLibs(out, apis = join(out, "..", "licenroute-apis")) {
  const done = [];
  for (const [repo, file] of LIBS) {
    const src = join(apis, repo, "src", file);
    if (!existsSync(src)) continue;
    const rev = gitRev(join(apis, repo));
    const header = `// Copied from licenroute-apis/${repo}/src/${file} at ${rev}: the same code as the API, run in your browser.\n// Regenerate with scripts/build-tools.mjs. Nothing typed into the tools leaves the browser.\n`;
    mkdirSync(join(out, "tools", "lib"), { recursive: true });
    writeFileSync(join(out, "tools", "lib", file), header + readFileSync(src, "utf8"));
    done.push(`${file}@${rev}`);
  }
  return done;
}

export function build({ out, date }) {
  const urls = [];
  const write = (path, html) => { const d = join(out, path); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "index.html"), html); urls.push(`${SITE}${path}`); };
  for (const lang of ["es", "en"]) {
    const c = C[lang], other = lang === "es" ? "en" : "es";
    for (const tool of TOOLS) {
      const t = tool.t[lang];
      const path = `${c.index}${tool[lang]}/`, altPath = `${C[other].index}${tool[other]}/`;
      const body = `  <p class="meta"><a href="${c.index}">${esc(c.indexName)}</a></p>
  <h1>${esc(t.title)}</h1>
  <p class="lead">${esc(t.lead)}</p>
  ${tool.form(lang)}
  <noscript><p class="err">${esc(c.noscript)}</p></noscript>
  <p class="meta">${esc(c.privacy)}</p>
  <h2>${lang === "es" ? "Cómo funciona" : "How it works"}</h2>
  <ul>
${t.about.map((a) => `    <li>${md(a)}</li>`).join("\n")}
  </ul>
  <section class="plan cta">
    <h3>${esc(t.cta)}</h3>
    <p>${esc(t.ctaText)}</p>
    <p><a class="btn btn-primary" href="/apis/${tool.api}/">${esc(c.ctaBtn)}</a></p>
  </section>
  <p class="meta">${lang === "es" ? "Otras herramientas" : "Other tools"}: ${TOOLS.filter((x) => x !== tool).map((x) => `<a href="${c.index}${x[lang]}/">${esc(x.t[lang].title)}</a>`).join(" · ")}</p>`;
      write(path, page({ lang, title: t.title, desc: t.desc, path, altPath, body,
        jsonld: { "@context": "https://schema.org", "@type": "WebApplication", name: t.title, description: t.desc, url: `${SITE}${path}`, inLanguage: lang,
          applicationCategory: tool.key === "vat" ? "FinanceApplication" : "UtilitiesApplication", operatingSystem: "Any (web browser)",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, isAccessibleForFree: true } }));
    }
    const body = `  <h1>${esc(c.indexTitle)}</h1>
  <p class="lead">${esc(c.indexLead)}</p>
  <ul class="guide-list">
${TOOLS.map((tool) => `    <li><a href="${c.index}${tool[lang]}/"><strong>${esc(tool.t[lang].title)}</strong><span>${esc(tool.t[lang].lead)}</span></a></li>`).join("\n")}
  </ul>
  <p class="meta">${esc(c.privacy)}</p>`;
    write(c.index, page({ lang, title: c.indexTitle, desc: c.indexLead, path: c.index, altPath: C[other].index, body,
      jsonld: { "@context": "https://schema.org", "@type": "CollectionPage", name: c.indexTitle, url: `${SITE}${c.index}`, inLanguage: lang } }));
  }
  const sitemap = join(out, "sitemap.xml");
  if (existsSync(sitemap)) writeFileSync(sitemap, replaceBlock(readFileSync(sitemap, "utf8"), "  <!-- tools:start -->", "  <!-- tools:end -->",
    urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`).join("\n"), "</urlset>"));
  const llms = join(out, "llms.txt");
  if (existsSync(llms)) writeFileSync(llms, replaceBlock(readFileSync(llms, "utf8"), "<!-- tools:start -->", "<!-- tools:end -->",
    `## Free tools\n\nBrowser tools with the same code as the Spanish APIs (nothing is sent to a server): ${TOOLS.map((t) => `[${t.t.en.title}](${SITE}/tools/${t.en}/)`).join(", ")}. Spanish versions under ${SITE}/es/herramientas/.`));
  return urls.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { out: { type: "string", default: "." }, date: { type: "string" } } });
  console.log("libs:", refreshLibs(values.out).join(", ") || "(kept)");
  console.log(`${build({ out: values.out, date: values.date ?? new Date().toISOString().slice(0, 10) })} tool pages written`);
}
