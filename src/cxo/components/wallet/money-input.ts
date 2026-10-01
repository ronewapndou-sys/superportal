/** Parse what people type for rand amounts: "25 000", "R25000", "2500,50". */
export function parseRand(input: string): number {
  const clean = input.replace(/[\sR ]/gi, "").replace(",", ".");
  if (!clean) return NaN;
  return Number(clean);
}

export const randToCents = (rand: number) => Math.round(rand * 100);
