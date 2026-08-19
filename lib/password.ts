import { randomInt } from "crypto";

// Ambiguous characters (0/O, 1/l/I) are excluded so handwritten or printed
// slips cannot be misread by students typing them in.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 8) {
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}
