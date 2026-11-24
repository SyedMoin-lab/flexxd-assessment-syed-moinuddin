import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/I/L), so a code is easy to read out at the front desk.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

/**
 * A random 8-character redemption code. Uses crypto.randomInt, not Math.random,
 * so codes can't be predicted (assumption 4). The caller checks it's unique.
 */
export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET.charAt(randomInt(ALPHABET.length));
  }
  return code;
}
