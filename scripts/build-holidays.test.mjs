import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, businessDays, listHolidays, longWeekends, slug } from "./build-holidays.mjs";

test("Spain 2026, Comunidad de Madrid: the BOE list (BOE-A-2025-21667), Sunday holidays not listed", () => {
  const md = listHolidays("ES", 2026, { region: "MD", lang: "es" }).map((h) => h.date.slice(5));
  assert.deepEqual([...new Set(md)], ["01-01", "01-06", "04-02", "04-03", "05-01", "05-02", "08-15", "10-12", "11-02", "12-07", "12-08", "12-25"]);
});

test("US 2026: observed Independence Day on Friday 3 July", () => {
  const us = listHolidays("US", 2026);
  assert.equal(us.find((h) => h.date === "2026-07-03").substitute, true);
});

test("long weekends and bridges; business days", () => {
  const lw = longWeekends([{ date: "2026-07-03", name: "Observed" }, { date: "2026-11-26", name: "Thanksgiving" }, { date: "2026-12-26", name: "Sat" }]);
  assert.deepEqual(lw.map((x) => [x.date, x.kind]), [["2026-07-03", "three"], ["2026-11-26", "bridge"]]);
  const bd = businessDays(2026, listHolidays("US", 2026));
  assert.equal(bd[6], 22); // July 2026: 23 weekdays minus 3 July
  assert.equal(slug("España"), "espana");
});

test("build: English pages for every country, Spanish pages, indexes, sitemap block, licence on every page", () => {
  const dir = mkdtempSync(join(tmpdir(), "lr-hol-"));
  writeFileSync(join(dir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n</urlset>\n`);
  writeFileSync(join(dir, "llms.txt"), "# LicenRoute\n");
  const n = build({ out: dir, years: [2026, 2027], date: "2026-11-22" });
  assert.ok(n > 450, String(n));
  const de = readFileSync(join(dir, "holidays/germany/2027/index.html"), "utf8");
  assert.ok(de.includes("Public holidays in Germany 2027") && de.includes("CC BY-SA 4.0") && de.includes('href="/apis/holidays-api/"'));
  assert.ok(de.includes("Business days per month"));
  const sa = readFileSync(join(dir, "holidays/saudi-arabia/2027/index.html"), "utf8");
  assert.ok(!sa.includes("Business days per month")); // Friday–Saturday weekend: no table
  const md = readFileSync(join(dir, "es/festivos/espana/comunidad-de-madrid/2026/index.html"), "utf8");
  assert.ok(md.includes('<html lang="es">') && md.includes("Festivos en Comunidad de Madrid 2026") && md.includes('href="/apis/festivos-es/"'));
  const mx = readFileSync(join(dir, "es/festivos/mexico/2027/index.html"), "utf8");
  assert.ok(mx.includes("Feriados y días festivos en México 2027") && mx.includes('hreflang="en" href="https://licenroute.com/holidays/mexico/2027/"'));
  assert.ok(existsSync(join(dir, "holidays/index.html")) && existsSync(join(dir, "es/festivos/index.html")));
  const sm = readFileSync(join(dir, "sitemap.xml"), "utf8");
  assert.equal(sm.match(/holidays:start/g).length, 1);
  assert.ok(sm.includes("https://licenroute.com/holidays/spain/2027/"));
  rmSync(dir, { recursive: true });
});

test("a moved holiday listed twice by the source is one row, flagged as substitute", () => {
  const md = listHolidays("ES", 2027, { region: "MD", lang: "es" }).filter((h) => h.date === "2027-05-03");
  assert.equal(md.length, 1);
  assert.equal(md[0].substitute, true);
  assert.equal(md[0].name, "Día de la Comunidad de Madrid");
});
