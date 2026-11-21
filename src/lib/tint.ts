import type { CSSProperties } from "react";

/** Stable sector prefix at the start of a specialty code (letters before the first digit). */
export function sectorOf(code: string): string {
  return (code.match(/^[A-Za-z]+/) || [])[0] || "";
}

/** Deterministic color tint derived from the specialty code — each specialty gets its own. */
export function tintFor(code: string) {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return {
    hue: (hash % 360 + 360) % 360,
    saturation: 30 + (hash % 40), // 30–69%
    lightness: 95 + (hash % 3), // 95–97%
  };
}

/** The specialty's icon letter: first Arabic letter of the code, else first Latin/digit. */
export function iconLetter(code: string): string {
  const ar = code.match(/[\u0600-\u06FF]/);
  if (ar) return ar[0];
  const latin = code.match(/[A-Za-z0-9]/);
  return latin ? latin[0].toUpperCase() : "?";
}

/** Distinctive gradient background for the specialty card. */
export function cardStyle(code: string): CSSProperties {
  const t = tintFor(code);
  return {
    background: `linear-gradient(135deg, hsl(${t.hue} ${t.saturation}% ${t.lightness}%) 0%, hsl(${t.hue} ${Math.max(t.saturation - 16, 18)}% ${Math.min(t.lightness + 3, 99)}%) 100%)`,
  };
}

/** Colored letter badge styled from the same tint. */
export function badgeStyle(code: string): CSSProperties {
  const t = tintFor(code);
  return { backgroundColor: `hsl(${t.hue} ${t.saturation}% 84%)`, color: "white" };
}
