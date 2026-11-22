// Copied from licenroute-apis/validaciones-es/src/validators.js at d9fc5c0: the same code as the API, run in your browser.
// Regenerate with scripts/build-tools.mjs. Nothing typed into the tools leaves the browser.
// Validación de identificadores españoles. Algoritmos públicos, sin datos externos.
// Cada función devuelve { valid, normalized, reason } y nunca lanza con entradas raras.

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

const clean = (value) => String(value ?? "").toUpperCase().replace(/[\s.\-_/]/g, "");
const result = (valid, normalized, reason = null) => ({ valid, normalized: valid ? normalized : null, reason: valid ? null : reason });

// NIF de persona física (DNI): 8 dígitos + letra de control.
export function validateNif(value) {
  const v = clean(value);
  const m = /^(\d{8})([A-Z])$/.exec(v);
  if (!m) return result(false, v, "format");
  const expected = DNI_LETTERS[Number(m[1]) % 23];
  return m[2] === expected ? result(true, v) : result(false, v, "check_letter");
}

// NIE: X, Y o Z + 7 dígitos + letra; X=0, Y=1, Z=2 delante de los dígitos para calcular la letra.
export function validateNie(value) {
  const v = clean(value);
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
  if (!m) return result(false, v, "format");
  const num = Number("XYZ".indexOf(m[1]) + m[2]);
  return m[3] === DNI_LETTERS[num % 23] ? result(true, v) : result(false, v, "check_letter");
}

// CIF / NIF de persona jurídica: letra de tipo + 7 dígitos + control (dígito o letra).
// Control: suma de posiciones pares + suma de cifras del doble de las impares; d = (10 - suma % 10) % 10.
const CIF_TYPES = "ABCDEFGHJNPQRSUVW";
const CIF_LETTER_ONLY = "NPQRSW"; // control siempre letra
const CIF_DIGIT_ONLY = "ABEH";    // control siempre dígito
export function validateCif(value) {
  const v = clean(value);
  const m = /^([A-Z])(\d{7})([0-9A-J])$/.exec(v);
  if (!m || !CIF_TYPES.includes(m[1])) return result(false, v, "format");
  const digits = m[2].split("").map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    if (i % 2 === 1) sum += d;
    else { const x = d * 2; sum += Math.floor(x / 10) + (x % 10); }
  });
  const control = (10 - (sum % 10)) % 10;
  const asLetter = "JABCDEFGHI"[control];
  const got = m[3];
  if (CIF_LETTER_ONLY.includes(m[1])) return got === asLetter ? result(true, v) : result(false, v, "check_char");
  if (CIF_DIGIT_ONLY.includes(m[1])) return got === String(control) ? result(true, v) : result(false, v, "check_char");
  return got === String(control) || got === asLetter ? result(true, v) : result(false, v, "check_char");
}

// IBAN (cualquier país, ISO 13616): letras a números y módulo 97 == 1. España: 24 caracteres.
const IBAN_LENGTHS = { ES: 24, PT: 25, FR: 27, DE: 22, IT: 27, GB: 22, NL: 18, BE: 16, IE: 22, AD: 24 };
export function validateIban(value) {
  const v = clean(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return result(false, v, "format");
  const len = IBAN_LENGTHS[v.slice(0, 2)];
  if (len && v.length !== len) return result(false, v, "length");
  const rearranged = v.slice(4) + v.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const n = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of n) rem = (rem * 10 + Number(d)) % 97;
  }
  if (rem !== 1) return result(false, v, "checksum");
  return result(true, v.replace(/(.{4})/g, "$1 ").trim());
}

// Código postal español: 5 dígitos; las dos primeras cifras son la provincia (01 a 52).
export function validatePostalCode(value) {
  const v = clean(value);
  if (!/^\d{5}$/.test(v)) return result(false, v, "format");
  const province = Number(v.slice(0, 2));
  return province >= 1 && province <= 52 ? result(true, v) : result(false, v, "province");
}

// Detecta el tipo de un identificador fiscal (NIF, NIE o CIF) y lo valida.
export function validateTaxId(value) {
  const v = clean(value);
  if (/^\d{8}[A-Z]$/.test(v)) return { type: "nif", ...validateNif(v) };
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) return { type: "nie", ...validateNie(v) };
  if (/^[A-Z]\d{7}[0-9A-J]$/.test(v)) return { type: "cif", ...validateCif(v) };
  return { type: null, valid: false, normalized: null, reason: "unknown_type" };
}

export const VALIDATORS = { nif: validateNif, nie: validateNie, cif: validateCif, iban: validateIban, cp: validatePostalCode };
