/** Admin-chosen display settings (stored in the meta table). */

export const THEMES = ["default", "white-black", "red-purple", "brown-shiny"] as const;
export type Theme = (typeof THEMES)[number];
export function isTheme(v: string | undefined): v is Theme {
  return v !== undefined && (THEMES as readonly string[]).includes(v);
}

export const FONT_STYLES = ["default", "compact", "large", "expanded"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];
export function isFontStyle(v: string | undefined): v is FontStyle {
  return v !== undefined && (FONT_STYLES as readonly string[]).includes(v);
}
