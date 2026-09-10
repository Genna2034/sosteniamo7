import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const { encryptSensitiveText, decryptSensitiveBytea } = await import("../../src/lib/security/crypto.ts");

test("cifra e decifra in formato bytea esadecimale", () => {
  const c = encryptSensitiveText("nota riservata àèì €");
  assert.ok(c.startsWith("\\x01"));
  assert.equal(decryptSensitiveBytea(c), "nota riservata àèì €");
  assert.equal(decryptSensitiveBytea(c.slice(2)), "nota riservata àèì €"); // anche senza prefisso (encode(...,'hex') dalla RPC)
});

test("due cifrature dello stesso testo differiscono (IV casuale)", () => {
  assert.notEqual(encryptSensitiveText("x"), encryptSensitiveText("x"));
});

test("manomissione del cifrato viene rilevata", () => {
  const c = encryptSensitiveText("integrità");
  const tampered = c.slice(0, -2) + (c.endsWith("00") ? "11" : "00");
  assert.throws(() => decryptSensitiveBytea(tampered));
});

test("chiave di lunghezza errata rifiutata", () => {
  const old = process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY;
  process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY = Buffer.from("corta").toString("base64");
  assert.throws(() => encryptSensitiveText("x"), /32 bytes/);
  process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY = old;
});
