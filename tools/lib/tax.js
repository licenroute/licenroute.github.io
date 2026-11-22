// Copied from licenroute-apis/impuestos-es/src/tax.js at 9239cc7: the same code as the API, run in your browser.
// Regenerate with scripts/build-tools.mjs. Nothing typed into the tools leaves the browser.
// Invoice taxes in Spain (IVA territory: mainland and Baleares). Integer cents, rounded half up to the cent.
// Rates from the consolidated BOE texts (checked 2026-11-21): Ley 37/1992 arts. 90, 91 and 161; RIRPF art. 95.
// The caller chooses the IVA rate: this API never decides which rate a product or service carries.

export const RATES = {
  iva: { 21: "general", 10: "reducido", 4: "superreducido", 0: "cero (art. 91 Cuatro)" },
  recargo: { 21: 5.2, 10: 1.4, 4: 0.5 },
  irpf: { 0: "sin retención", 7: "profesional, inicio de actividad (año de inicio y los dos siguientes)", 15: "profesional, general" },
  sources: ["https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740", "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820"],
  territory: "Mainland Spain and Baleares. Canarias (IGIC), Ceuta and Melilla (IPSI) are outside IVA."
};

const toCents = (s) => { const m = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(String(s)); return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null; };
const pct = (cents, rate) => Math.round((cents * Math.round(rate * 100)) / 10000); // rate in %, two decimals (5,2 %)
const eur = (cents) => cents / 100;

/** Taxes of an invoice from its taxable base. */
export function invoice(base, { iva = 21, recargo = false, irpf = 0 } = {}) {
  const b = toCents(base);
  if (b === null) return { error: "invalid_amount" };
  if (!Object.hasOwn(RATES.iva, iva)) return { error: "invalid_iva" };
  if (!Object.hasOwn(RATES.irpf, irpf)) return { error: "invalid_irpf" };
  if (recargo && !Object.hasOwn(RATES.recargo, iva)) return { error: "recargo_needs_iva_21_10_4" };
  const ivaC = pct(b, iva);
  const reRate = recargo ? RATES.recargo[iva] : 0, reC = recargo ? pct(b, reRate) : 0;
  const irpfC = pct(b, irpf);
  return {
    base: eur(b),
    iva: { rate: iva, amount: eur(ivaC) },
    recargo: { rate: reRate, amount: eur(reC) },
    irpf: { rate: irpf, amount: eur(irpfC) },
    total: eur(b + ivaC + reC - irpfC)
  };
}

/** Base and IVA from a total that already includes IVA (no recargo, no retention). */
export function fromTotal(total, { iva = 21 } = {}) {
  const t = toCents(total);
  if (t === null) return { error: "invalid_amount" };
  if (!Object.hasOwn(RATES.iva, iva)) return { error: "invalid_iva" };
  const b = Math.round((t * 100) / (100 + iva));
  return { total: eur(t), base: eur(b), iva: { rate: iva, amount: eur(t - b) } };
}
