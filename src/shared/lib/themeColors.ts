import type { AppSettingsColorPalette } from "@/features/account/api/settingsApi";
import { DEEMA_BRAND } from "./brandColors";
import { lighten, darken, withAlpha, shade, mixHex, tint } from "./colorUtils";

/** CSS variable name → value */
export type CSSVariableMap = Record<string, string>;

/** Grocery dark: warm charcoal shelves, not OLED black. */
export const DARK_CANVAS = "#171412";
export const DARK_SECTION = "#1C1916";
export const DARK_ELEVATED = "#24201C";

/**
 * Clean modern shells — Surface canvas, soft Background wash, white cards.
 * Avoid stacking Primary/Secondary/Accent browns in large fills.
 */
const LIGHT_NEUTRAL = {
  canvas: DEEMA_BRAND.surface,
  section: mixHex(DEEMA_BRAND.surface, DEEMA_BRAND.background, 0.42),
  muted: mixHex("#FFFFFF", DEEMA_BRAND.background, 0.35),
  hover: mixHex(DEEMA_BRAND.surface, DEEMA_BRAND.accent, 0.28),
  border: mixHex("#E8E4DE", DEEMA_BRAND.accent, 0.35),
  borderSoft: mixHex("#F0EDE8", DEEMA_BRAND.background, 0.4),
};

/** Static sheet tokens always available to components. */
export function buildBrandSheetTokens(): CSSVariableMap {
  return {
    "--color-brand-primary": DEEMA_BRAND.primary,
    "--color-brand-secondary": DEEMA_BRAND.secondary,
    "--color-brand-accent": DEEMA_BRAND.accent,
    "--color-brand-background": DEEMA_BRAND.background,
    "--color-brand-surface": DEEMA_BRAND.surface,
    "--color-brand-highlight": DEEMA_BRAND.highlight,
    "--color-brand-text": DEEMA_BRAND.text,
  };
}

export function buildApiTintedLightSurfaces(main: string, second: string): CSSVariableMap {
  const brandWhisper = mixHex("#ffffff", tint(main, 0.97), 0.22);
  const sectionWash = mixHex(LIGHT_NEUTRAL.canvas, DEEMA_BRAND.background, 0.38);
  const highlightWhisper = mixHex(LIGHT_NEUTRAL.canvas, tint(second, 0.9), 0.18);

  return {
    ...buildBrandSheetTokens(),
    "--color-bg": LIGHT_NEUTRAL.canvas,
    "--color-blue-off": brandWhisper,
    "--color-blue-very-light": "#FFFFFF",
    "--color-blue-border": LIGHT_NEUTRAL.borderSoft,
    "--color-bg-primary": LIGHT_NEUTRAL.canvas,
    "--color-bg-secondary": sectionWash,
    "--color-bg-tertiary": LIGHT_NEUTRAL.muted,
    "--color-bg-hover": LIGHT_NEUTRAL.hover,
    "--color-bg-active": mixHex(LIGHT_NEUTRAL.hover, tint(main, 0.92), 0.1),
    "--color-bg-light": LIGHT_NEUTRAL.canvas,
    "--color-bg-card": "#ffffff",
    "--color-bg-muted": LIGHT_NEUTRAL.muted,
    "--color-bg-surface": "#ffffff",
    "--color-bg-input": "#ffffff",
    "--color-bg-accent-soft": withAlpha(DEEMA_BRAND.accent, 0.28),
    "--color-bg-highlight-soft": highlightWhisper,
    "--color-text-inverse": "#ffffff",
    "--color-border-primary": LIGHT_NEUTRAL.border,
    "--color-border-secondary": mixHex(LIGHT_NEUTRAL.border, DEEMA_BRAND.secondary, 0.15),
    "--color-border-light": LIGHT_NEUTRAL.borderSoft,
    "--color-overlay-brand": withAlpha(darken(main, 12), 0.5),
    "--color-overlay-brand-light": withAlpha(darken(main, 12), 0.25),
  };
}

/**
 * Dark-mode page chrome from API `main_color` / `second_color`
 * (deep `shade` / alpha mixes — same idea as account dark scope).
 */
export function buildApiTintedDarkSurfaces(main: string, second: string): CSSVariableMap {
  const bgRoot = mixHex(DARK_CANVAS, shade(main, 0.88), 0.16);
  const bgPrimary = mixHex(DARK_SECTION, shade(main, 0.85), 0.14);
  const bgSecondary = mixHex(DARK_SECTION, shade(second, 0.82), 0.12);
  const bgTertiary = mixHex(DARK_CANVAS, shade(main, 0.92), 0.1);
  const bgCard = mixHex(DARK_ELEVATED, shade(main, 0.78), 0.12);
  const bgLight = mixHex(DARK_ELEVATED, shade(main, 0.72), 0.16);
  const bgHover = mixHex(DARK_ELEVATED, shade(main, 0.65), 0.22);
  const bgActive = mixHex(DARK_ELEVATED, shade(main, 0.55), 0.28);
  const bgMuted = mixHex(DARK_SECTION, shade(second, 0.86), 0.12);
  const bgAccentSoft = withAlpha(second, 0.16);

  return {
    "--color-bg": bgRoot,
    "--color-blue-off": bgSecondary,
    "--color-blue-very-light": bgPrimary,
    "--color-blue-border": withAlpha(main, 0.22),
    "--color-bg-primary": bgPrimary,
    "--color-bg-secondary": bgSecondary,
    "--color-bg-tertiary": bgTertiary,
    "--color-bg-hover": bgHover,
    "--color-bg-active": bgActive,
    "--color-bg-light": bgLight,
    "--color-bg-card": bgCard,
    "--color-bg-card-elevated": bgCard,
    "--color-bg-muted": bgMuted,
    "--color-bg-surface": bgPrimary,
    "--color-bg-input": mixHex(DARK_ELEVATED, shade(main, 0.9), 0.2),
    "--color-bg-accent-soft": bgAccentSoft,
    "--color-text-inverse": shade(main, 0.95),
    "--color-border-primary": withAlpha(main, 0.18),
    "--color-border-secondary": withAlpha(second, 0.22),
    "--color-border-light": withAlpha(main, 0.12),
    "--color-overlay-brand": withAlpha(shade(main, 0.7), 0.7),
    "--color-overlay-brand-light": withAlpha(shade(main, 0.7), 0.4),
  };
}

/**
 * Derive a full light-mode palette from API colours.
 *
 *   main (main_color) → brand / accent / primary
 *   text (text_color) → body text tokens
 *   Surfaces / borders → tinted from `main_color` + `second_color` (see `buildApiTintedLightSurfaces`).
 */
export function buildLightPalette(colors: AppSettingsColorPalette): CSSVariableMap {
  const main = colors.main_color!;
  const text = colors.text_color!;
  const second = colors.second_color ?? lighten(main, 16);

  return {
    // ── Direct API values ──
    "--color-main": main,
    "--color-text": text,
    /** Secondary CTA / active contrast — Highlight from brand sheet */
    "--color-api-second": second,
    "--color-api-second-hover": darken(second, 8),

    // ── Brand hierarchy (Primary for CTAs; Highlight for contrast) ──
    "--color-primary": main,
    "--color-primary-light": DEEMA_BRAND.secondary,
    "--color-primary-dark": darken(main, 10),
    "--color-secondary": DEEMA_BRAND.accent,
    "--color-highlight": DEEMA_BRAND.highlight,
    "--color-trust": "#0F766E",

    "--color-blue-light": DEEMA_BRAND.accent,

    ...buildApiTintedLightSurfaces(main, second),

    // ── Text ──
    "--color-text-primary": text,
    "--color-text-secondary": lighten(text, 18),
    "--color-text-tertiary": lighten(text, 32),
    "--color-text-heading": text,
    "--color-text-muted": lighten(text, 26),

    // ── Borders ──
    "--color-border-accent": withAlpha(main, 0.35),
    "--color-border-accent-light": withAlpha(DEEMA_BRAND.accent, 0.55),
    "--color-border-accent-strong": main,

    // ── Accents ──
    "--color-accent-primary": main,
    "--color-accent-primary-hover": darken(main, 8),
    "--color-accent-light": DEEMA_BRAND.highlight,
    "--color-accent-light-bg": withAlpha(DEEMA_BRAND.accent, 0.35),

    // ── Status ──
    "--color-success": "#16a34a",
    "--color-success-light": "#22c55e",
    "--color-warning": "#f59e0b",
    "--color-warning-dark": "#ca8a04",
    "--color-error": "#ef4444",
    "--color-error-light": "#f87171",
    "--color-status-error-bg": withAlpha("#ef4444", 0.08),
    "--color-discount": "#22c55e",
    "--color-delete": "#ff4d4f",
    "--color-gold": DEEMA_BRAND.accent,
    "--color-accent-gold": DEEMA_BRAND.accent,
    "--color-accent-plum": DEEMA_BRAND.secondary,
    "--color-accent-slate": "#64748b",

    // ── Gradient: Primary → Highlight (modern, not muddy brown→clay) ──
    "--color-gradient-from": main,
    "--color-gradient-to": DEEMA_BRAND.highlight,

    // ── Shadow ──
    "--color-shadow": withAlpha(main, 0.08),
    "--color-shadow-strong": withAlpha(main, 0.14),
    "--color-shadow-accent": withAlpha(DEEMA_BRAND.highlight, 0.22),

    "--color-calendar-selected": main,
  };
}

/**
 * Derive a full dark-mode palette from API `dark_color`.
 *
 * Surfaces / borders use `buildApiTintedDarkSurfaces` from API `main_color` / `second_color`.
 */
export function buildDarkPalette(colors: AppSettingsColorPalette): CSSVariableMap {
  const main = colors.main_color!;
  const text = colors.text_color!;
  const second = colors.second_color ?? lighten(main, 10);

  return {
    ...buildBrandSheetTokens(),
    "--color-main": main,
    "--color-text": text,
    "--color-api-second": second,
    "--color-api-second-hover": darken(second, 10),

    "--color-primary": main,
    "--color-primary-light": second,
    "--color-primary-dark": darken(main, 12),
    "--color-secondary": DEEMA_BRAND.secondary,
    "--color-highlight": DEEMA_BRAND.highlight,
    "--color-trust": "#2DD4BF",

    "--color-blue-light": lighten(main, 8),

    ...buildApiTintedDarkSurfaces(main, second),

    "--color-text-primary": text,
    "--color-text-secondary": withAlpha(text, 0.88),
    "--color-text-tertiary": withAlpha(text, 0.72),
    "--color-text-heading": text,
    "--color-text-muted": withAlpha("#E8E4DC", 0.82),

    "--color-border-accent": withAlpha(main, 0.35),
    "--color-border-accent-light": withAlpha(second, 0.3),
    "--color-border-accent-strong": main,

    "--color-accent-primary": main,
    "--color-accent-primary-hover": darken(main, 8),
    "--color-accent-light": second,
    "--color-accent-light-bg": withAlpha(main, 0.12),

    "--color-success": "#22c55e",
    "--color-success-light": "#4ade80",
    "--color-warning": "#fbbf24",
    "--color-warning-dark": "#d97706",
    "--color-error": "#f87171",
    "--color-error-light": "#fca5a5",
    "--color-status-error-bg": withAlpha("#f87171", 0.1),
    "--color-discount": "#4ade80",
    "--color-delete": "#f87171",
    "--color-gold": DEEMA_BRAND.accent,
    "--color-accent-gold": DEEMA_BRAND.accent,
    "--color-accent-plum": DEEMA_BRAND.secondary,
    "--color-accent-slate": "#94a3b8",

    "--color-gradient-from": main,
    "--color-gradient-to": second,

    "--color-shadow": withAlpha(main, 0.12),
    "--color-shadow-strong": withAlpha(main, 0.18),
    "--color-shadow-accent": withAlpha(second, 0.18),

    "--color-calendar-selected": main,
  };
}

/**
 * Apply a map of CSS custom properties to the document root.
 * Safe to call repeatedly — simply overwrites the previous values.
 */
export function applyCSSVariables(vars: CSSVariableMap): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Remove all dynamically-set CSS variables (restores CSS-file defaults).
 */
export function clearCSSVariables(vars: CSSVariableMap): void {
  const root = document.documentElement;
  for (const key of Object.keys(vars)) {
    root.style.removeProperty(key);
  }
}

/**
 * Check whether an API palette has enough data to generate a theme.
 */
export function isPaletteComplete(p?: AppSettingsColorPalette): p is AppSettingsColorPalette & {
  main_color: string;
  text_color: string;
} {
  return Boolean(p?.main_color && p?.text_color);
}

/**
 * Which API palette should drive CSS variables for the active UI theme.
 * In **dark** mode, uses `dark_color` when complete; otherwise falls back to
 * `color` so `buildDarkPalette` still receives API main/text (fixes empty theme
 * when the backend omits or partially fills `dark_color`).
 */
export function resolveApiPaletteForTheme(
  theme: "light" | "dark",
  lightPalette?: AppSettingsColorPalette,
  darkPalette?: AppSettingsColorPalette,
): AppSettingsColorPalette | undefined {
  if (theme === "light") {
    return isPaletteComplete(lightPalette) ? lightPalette : undefined;
  }
  if (isPaletteComplete(darkPalette)) return darkPalette;
  if (isPaletteComplete(lightPalette)) return lightPalette;
  return undefined;
}
