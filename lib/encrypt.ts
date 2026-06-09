// FIX (C5): Hardened token encryption.
//
// The previous implementation used `CryptoJS.AES.encrypt(text, key)`, which:
//   • derives the key with the legacy OpenSSL EVP_BytesToKey (MD5-based, weak),
//   • uses CBC with no authentication tag (tamperable),
//   • and — worst of all — if ENCRYPTION_KEY was missing, `key` became the JS
//     value `undefined`, coercing to the string "undefined" and making every
//     stored token trivially decryptable.
//
// This version uses AES-256-GCM via Node's built-in `crypto`:
//   • a 32-byte key derived from ENCRYPTION_KEY with SHA-256,
//   • a random 96-bit IV per message (so equal plaintexts differ),
//   • an authentication tag (tampered ciphertext fails to decrypt),
//   • and a hard failure if ENCRYPTION_KEY is not set.
//
// Backward compatibility: new ciphertexts are prefixed with "v2:". Older tokens
// written by the legacy crypto-js path have no prefix and are still readable via
// a fallback, so existing connections keep working until they're rewritten.

import crypto from "crypto";
import CryptoJS from "crypto-js";

const PREFIX = "v2:";

/** Derive a fixed 32-byte AES key from the configured secret. Throws if unset. */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — refusing to (de)crypt tokens.");
  }
  return crypto.createHash("sha256").update(raw).digest(); // 32 bytes
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [12-byte IV][16-byte tag][ciphertext], base64-encoded, "v2:"-prefixed.
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  // New format (AES-256-GCM).
  if (ciphertext.startsWith(PREFIX)) {
    const key = getKey();
    const raw = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  }

  // Legacy fallback: tokens encrypted by the old crypto-js AES (pre-C5 fix).
  const legacyKey = process.env.ENCRYPTION_KEY;
  if (!legacyKey) {
    throw new Error("ENCRYPTION_KEY is not set — cannot decrypt legacy token.");
  }
  return CryptoJS.AES.decrypt(ciphertext, legacyKey).toString(CryptoJS.enc.Utf8);
}
