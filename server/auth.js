const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, key] = (stored || "").split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(password, salt, keyBuffer.length);
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

module.exports = { hashPassword, verifyPassword };
