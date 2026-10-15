import { randomInt } from "node:crypto";

// 3 random letters from the parish name + "-" + 3 random digits, e.g. GDN-482
export function candidateCodeFor(parishName: string): string {
  const pool = parishName.toUpperCase().replace(/[^A-Z]/g, "").split("");
  const letters: string[] = [];
  while (letters.length < 3) {
    if (pool.length === 0) {
      letters.push(String.fromCharCode(65 + randomInt(26)));
    } else {
      letters.push(pool.splice(randomInt(pool.length), 1)[0]);
    }
  }
  return `${letters.join("")}-${String(randomInt(1000)).padStart(3, "0")}`;
}