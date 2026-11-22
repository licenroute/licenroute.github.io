// Free tools of licenroute.com: the same code as the APIs (tools/lib/), run in the browser. Nothing is sent anywhere.
import { invoice, fromTotal } from "./lib/tax.js";
import { amountToWords, parseAmount } from "./lib/formats.js";
import { validateIban, validatePostalCode, validateTaxId } from "./lib/validators.js";

const lang = document.documentElement.lang === "es" ? "es" : "en";
const L = {
  es: {
    base: "Base imponible", iva: "IVA", recargo: "Recargo de equivalencia", irpf: "Retención de IRPF", total: "Total de la factura",
    fromTotal: "Total con IVA", amount: "Escribe un importe válido, por ejemplo 1250 o 1.250,50.", copy: "Copiar", copied: "Copiado",
    errors: { invalid_amount: "Escribe un importe válido, por ejemplo 1250 o 1250,50.", recargo_needs_iva_21_10_4: "El recargo de equivalencia solo existe con IVA del 21, 10 o 4 %.",
      invalid_iva: "Tipo de IVA no válido.", invalid_irpf: "Retención no válida.", out_of_range: "El importe debe estar entre 0 y 999.999.999.999,99." },
    valid: "Válido", invalid: "No válido",
    types: { nif: "NIF (DNI)", nie: "NIE", cif: "CIF", iban: "IBAN", cp: "Código postal" },
    reasons: { format: "El formato no corresponde a ningún NIF, NIE, CIF, IBAN ni código postal.", checksum: "El dígito o la letra de control no coincide: probablemente hay un error al teclear.",
      length: "La longitud no corresponde al país del IBAN.", province: "Las dos primeras cifras no son una provincia (01 a 52).", unknown_type: "No parece un NIF, NIE, CIF, IBAN ni código postal.",
      check_letter: "La letra de control no coincide: revisa los números.", check_char: "El carácter de control no coincide: revisa los números.", empty: "Escribe un identificador." }
  },
  en: {
    base: "Taxable base", iva: "IVA (VAT)", recargo: "Recargo de equivalencia", irpf: "IRPF withholding", total: "Invoice total",
    fromTotal: "Total with IVA", amount: "Type a valid amount, for example 1250 or 1250.50.", copy: "Copy", copied: "Copied",
    errors: { invalid_amount: "Type a valid amount, for example 1250 or 1250,50.", recargo_needs_iva_21_10_4: "Recargo de equivalencia only exists with IVA at 21, 10 or 4%.",
      invalid_iva: "Invalid IVA rate.", invalid_irpf: "Invalid withholding.", out_of_range: "The amount must be between 0 and 999,999,999,999.99." },
    valid: "Valid", invalid: "Not valid",
    types: { nif: "NIF (DNI)", nie: "NIE", cif: "CIF", iban: "IBAN", cp: "Postal code" },
    reasons: { format: "The format matches no NIF, NIE, CIF, IBAN or postal code.", checksum: "The control digit or letter does not match: probably a typo.",
      length: "The length does not match the IBAN's country.", province: "The first two digits are not a province (01 to 52).", unknown_type: "It does not look like a NIF, NIE, CIF, IBAN or postal code.",
      check_letter: "The control letter does not match: check the digits.", check_char: "The control character does not match: check the digits.", empty: "Type an identifier." }
  }
}[lang];

const money = (n) => new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }).format(n);
const el = (id) => document.getElementById(id);
const show = (out, html) => { out.innerHTML = html; out.hidden = false; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The tax module reads 1250 or 1250,50; also accept 1.250,50 and 1250.50 typed by people.
function normalizeAmount(raw) {
  const t = String(raw).trim().replace(/\s|€/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) return t.replace(/\./g, "");
  if (/^\d+\.\d{1,2}$/.test(t)) return t.replace(".", ",");
  return t;
}

function copyButton(text) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn btn-quiet"; b.textContent = L.copy;
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); b.textContent = L.copied; setTimeout(() => (b.textContent = L.copy), 1500); } catch {} });
  return b;
}

const vat = el("tool-vat");
if (vat) {
  const run = (e) => {
    e?.preventDefault();
    const out = el("vat-out"), amount = normalizeAmount(el("vat-amount").value), iva = Number(el("vat-iva").value);
    if (!amount) { out.hidden = true; return; }
    if (el("vat-mode").value === "total") {
      const r = fromTotal(amount, { iva });
      if (r.error) return show(out, `<p class="err">${esc(L.errors[r.error] ?? r.error)}</p>`);
      return show(out, `<table><tbody><tr><th scope="row">${L.base}</th><td>${money(r.base)}</td></tr><tr><th scope="row">${L.iva} (${r.iva.rate} %)</th><td>${money(r.iva.amount)}</td></tr><tr class="sum"><th scope="row">${L.fromTotal}</th><td>${money(r.total)}</td></tr></tbody></table>`);
    }
    const r = invoice(amount, { iva, recargo: el("vat-recargo").checked, irpf: Number(el("vat-irpf").value) });
    if (r.error) return show(out, `<p class="err">${esc(L.errors[r.error] ?? r.error)}</p>`);
    const rows = [[L.base, r.base], [`${L.iva} (${r.iva.rate} %)`, r.iva.amount]];
    if (r.recargo.rate) rows.push([`${L.recargo} (${String(r.recargo.rate).replace(".", lang === "es" ? "," : ".")} %)`, r.recargo.amount]);
    if (r.irpf.rate) rows.push([`${L.irpf} (${r.irpf.rate} %)`, -r.irpf.amount]);
    show(out, `<table><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${money(v)}</td></tr>`).join("")}<tr class="sum"><th scope="row">${L.total}</th><td>${money(r.total)}</td></tr></tbody></table>`);
  };
  vat.addEventListener("submit", run);
  vat.addEventListener("input", run);
  el("vat-mode").addEventListener("change", () => { const t = el("vat-mode").value === "total"; el("vat-extra").hidden = t; run(); });
  run(); // the example value shows its result straight away
}

const words = el("tool-words");
if (words) {
  const run = (e) => {
    e?.preventDefault();
    const out = el("words-out"), raw = el("words-amount").value.trim();
    if (!raw) { out.hidden = true; return; }
    let p = parseAmount(raw);
    if (!p.valid && /^\d+\.\d{1,2}$/.test(raw)) p = parseAmount(raw.replace(".", ","));
    if (!p.valid) return show(out, `<p class="err">${esc(L.amount)}</p>`);
    const r = amountToWords(p.amount);
    if (r.error) return show(out, `<p class="err">${esc(L.errors[r.error])}</p>`);
    const text = el("words-upper").checked ? r.words.toUpperCase() : r.words;
    show(out, `<p class="result">${esc(text)}</p><p class="meta">${money(r.amount)}</p>`);
    out.append(copyButton(text));
  };
  words.addEventListener("submit", run);
  words.addEventListener("input", run);
  run();
}

const ids = el("tool-ids");
if (ids) {
  const run = (e) => {
    e?.preventDefault();
    const out = el("ids-out"), raw = el("ids-value").value.trim();
    if (!raw) { out.hidden = true; return; }
    const compact = raw.toUpperCase().replace(/[\s.\-_/]/g, "");
    let type, r;
    if (/^[A-Z]{2}\d{2}/.test(compact)) { type = "iban"; r = validateIban(raw); }
    else if (/^\d{5}$/.test(compact)) { type = "cp"; r = validatePostalCode(raw); }
    else { r = validateTaxId(raw); type = r.type; }
    const label = type ? L.types[type] : "";
    const reason = r.valid ? "" : `<p>${esc(L.reasons[r.reason] ?? L.reasons.checksum)}</p>`;
    show(out, `<p class="result ${r.valid ? "ok" : "err"}">${r.valid ? "✓" : "✗"} ${r.valid ? L.valid : L.invalid}${label ? ` · ${label}` : ""}</p>${r.valid && r.normalized ? `<p class="meta"><code>${esc(r.normalized)}</code></p>` : ""}${reason}`);
  };
  ids.addEventListener("submit", run);
  ids.addEventListener("input", run);
  run();
}
