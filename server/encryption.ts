import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

/**
 * Encrypt sensitive data (passwords, tokens)
 */
export function encryptData(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, "hex");

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encrypted: string, iv: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash a value for comparison (one-way)
 */
export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
