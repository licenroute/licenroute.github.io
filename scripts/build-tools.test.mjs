import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoice, fromTotal } from "../tools/lib/tax.js";
import { amountToWords, parseAmount } from "../tools/lib/formats.js";
import { validateIban, validateTaxId } from "../tools/lib/validators.js";
import { build } from "./build-tools.mjs";

test("the copied API code gives the API's answers", () => {
  assert.equal(invoice("1000", { iva: 21, irpf: 15 }).total, 1060);
  assert.equal(invoice("100", { iva: 10, recargo: true }).total, 111.4);
  assert.equal(fromTotal("121", { iva: 21 }).base, 100);
  assert.equal(amountToWords(parseAmount("1.234,56").amount).words, "mil doscientos treinta y cuatro euros con cincuenta y seis céntimos");
  assert.equal(validateTaxId("12345678Z").valid, true);
  assert.equal(validateTaxId("X1234567L").type, "nie");
  assert.equal(validateIban("ES91 2100 0418 4502 0005 1332").valid, true);
});

test("the copies match the APIs' sources when those are next to the site", () => {
  const apis = new URL("../../licenroute-apis/", import.meta.url).pathname;
  for (const [repo, file] of [["validaciones-es", "validators.js"], ["impuestos-es", "tax.js"], ["formatos-es", "formats.js"]]) {
    const src = join(apis, repo, "src", file);
    if (!existsSync(src)) continue;
    const copy = readFileSync(new URL(`../tools/lib/${file}`, import.meta.url), "utf8").split("\n").slice(2).join("\n");
    assert.equal(copy, readFileSync(src, "utf8"), file);
  }
});

test("pages in both languages, linked to each other, with the API link and the privacy note", () => {
  const dir = mkdtempSync(join(tmpdir(), "lr-tools-"));
  writeFileSync(join(dir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n</urlset>\n`);
  assert.equal(build({ out: dir, date: "2026-11-22" }), 8);
  const es = readFileSync(join(dir, "es/herramientas/calculadora-iva-irpf/index.html"), "utf8");
  assert.ok(es.includes('<html lang="es">') && es.includes('id="tool-vat"') && es.includes('href="/apis/impuestos-es/"') && es.includes("no se envía"));
  assert.ok(es.includes('hreflang="en" href="https://licenroute.com/tools/spain-vat-irpf-calculator/"'));
  const en = readFileSync(join(dir, "tools/spanish-nie-nif-iban-validator/index.html"), "utf8");
  assert.ok(en.includes('<html lang="en">') && en.includes('id="tool-ids"') && en.includes('src="/tools/tools.js'));
  assert.equal(readFileSync(join(dir, "sitemap.xml"), "utf8").match(/<loc>/g).length, 8);
  rmSync(dir, { recursive: true });
});
