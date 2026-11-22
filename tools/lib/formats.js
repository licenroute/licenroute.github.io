// Copied from licenroute-apis/formatos-es/src/formats.js at 3c91ef4: the same code as the API, run in your browser.
// Regenerate with scripts/build-tools.mjs. Nothing typed into the tools leaves the browser.
// Spanish formats: amounts in words (invoices, cheques), reading Spanish amounts and dates. No external data.

const UNITS = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece",
  "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

/** 0..999 in words; `apocope` turns a final "uno" into "un" (un euro, veintiún euros, mil). */
function under1000(n, apocope) {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100), r = n % 100;
  let words;
  if (r < 30) words = UNITS[r];
  else { const t = Math.floor(r / 10), u = r % 10; words = TENS[t] + (u ? ` y ${UNITS[u]}` : ""); }
  if (apocope) words = words.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  return [HUNDREDS[h], words].filter(Boolean).join(" ");
}

/** Integer 0..999 999 999 999 in words. */
export function integerToWords(n, apocope = false) {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999_999) throw new RangeError("out_of_range");
  if (n === 0) return "cero";
  const millions = Math.floor(n / 1e6), rest = n % 1e6;
  const thousands = Math.floor(rest / 1000), units = rest % 1000;
  const parts = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${thousandsToWords(millions)} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${under1000(thousands, true)} mil`);
  if (units) parts.push(under1000(units, apocope));
  return parts.join(" ");
}
// Up to 999 999 for the millions part ("doscientos mil millones").
function thousandsToWords(n) {
  const th = Math.floor(n / 1000), u = n % 1000;
  return [th ? (th === 1 ? "mil" : `${under1000(th, true)} mil`) : "", u ? under1000(u, true) : ""].filter(Boolean).join(" ");
}

/** An amount in euros, in words: "mil doscientos treinta y cuatro euros con cincuenta y seis céntimos". */
export function amountToWords(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 999_999_999_999.99) return { error: "out_of_range" };
  const cents = Math.round(amount * 100);
  const euros = Math.floor(cents / 100), c = cents % 100;
  // "de euros" after an exact million: "un millón de euros".
  const eurosWords = `${integerToWords(euros, true)}${euros >= 1e6 && euros % 1e6 === 0 ? " de" : ""} ${euros === 1 ? "euro" : "euros"}`;
  const centsWords = c ? ` con ${integerToWords(c, true)} ${c === 1 ? "céntimo" : "céntimos"}` : "";
  return { amount: cents / 100, words: eurosWords + centsWords };
}

/** Reads an amount written the Spanish way: "1.234,56 €", "1234,5", "€ 12", "12 EUR". */
export function parseAmount(text) {
  const t = String(text ?? "").trim().replace(/\s+/g, "").replace(/(?:€|eur|euros?)$/i, "").replace(/^(?:€|eur)/i, "");
  if (!/^-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^-?\d+(?:,\d{1,2})?$/.test(t)) return { input: text, valid: false, amount: null, reason: "format" };
  const amount = Number(t.replace(/\./g, "").replace(",", "."));
  return { input: text, valid: true, amount, formatted: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount), reason: null };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const iso = (y, m, d) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const real = (y, m, d) => { const s = iso(y, m, d); const dt = new Date(`${s}T00:00:00Z`); return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === s; };

/** Reads a Spanish date: "21 de noviembre de 2026", "21/11/2026", "21-11-2026", "21.11.26" (two-digit years: 2000-2099). */
export function parseDate(text) {
  const raw = String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  let y, m, d;
  let x = /^(\d{1,2}) de ([a-záéíóú]+) (?:de|del) (\d{4})$/.exec(raw);
  if (x) { d = Number(x[1]); m = MONTHS.indexOf(x[2].replace("setiembre", "septiembre")) + 1; y = Number(x[3]); }
  else if ((x = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(raw))) { d = Number(x[1]); m = Number(x[2]); y = Number(x[3].length === 2 ? `20${x[3]}` : x[3]); }
  else return { input: text, valid: false, date: null, reason: "format" };
  if (!m || !real(y, m, d)) return { input: text, valid: false, date: null, reason: "invalid_date" };
  const date = iso(y, m, d);
  return { input: text, valid: true, date, long: `${d} de ${MONTHS[m - 1]} de ${y}`, reason: null };
}
