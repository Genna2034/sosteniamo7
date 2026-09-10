// AES-256-GCM per i campi L3. Formato: [versione 0x01][iv 12][tag 16][ciphertext]. Chiave solo lato server.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("SOSTENIAMO_FIELD_ENCRYPTION_KEY missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Field encryption key must decode to 32 bytes");
  return key;
}

export function encryptSensitiveText(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const packed = Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
  return `\\x${packed.toString("hex")}`; // formato bytea esadecimale di PostgreSQL
}

export function decryptSensitiveBytea(bytea: string): string {
  const hex = bytea.startsWith("\\x") ? bytea.slice(2) : bytea;
  const packed = Buffer.from(hex, "hex");
  if (packed[0] !== 1) throw new Error("Unsupported encrypted payload version");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), packed.subarray(1, 13));
  decipher.setAuthTag(packed.subarray(13, 29));
  return Buffer.concat([decipher.update(packed.subarray(29)), decipher.final()]).toString("utf8");
}
