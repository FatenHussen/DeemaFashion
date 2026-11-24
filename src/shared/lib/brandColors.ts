import type { AppSettingsColorPalette } from "@/features/account/api/settingsApi";

/**
 * Deema Fashion — full brand sheet.
 * Roles stay distinct so close browns do not muddy the UI.
 *
 * Primary   #5A3A2E  brand / headers / primary CTA
 * Secondary #8B5E4A  section tint (sparingly)
 * Accent    #D4B39A  soft chips / secondary buttons
 * Background#EAD8C7  page wash bands
 * Surface   #F7F5F2  app canvas
 * Highlight #A9B07A  modern contrast / active / secondary CTA
 * Text      #1F1F1F  body
 */
export const DEEMA_BRAND = {
  primary: "#5A3A2E",
  secondary: "#8B5E4A",
  accent: "#D4B39A",
  background: "#EAD8C7",
  surface: "#F7F5F2",
  highlight: "#A9B07A",
  text: "#1F1F1F",
  textOnDark: "#F7F5F2",
} as const;

/** API light palette — Highlight as `second` so CTAs contrast Primary (not clay-on-brown). */
export const DEEMA_BRAND_LIGHT: AppSettingsColorPalette = {
  main_color: DEEMA_BRAND.primary,
  second_color: DEEMA_BRAND.highlight,
  text_color: DEEMA_BRAND.text,
};

export const DEEMA_BRAND_DARK: AppSettingsColorPalette = {
  main_color: DEEMA_BRAND.accent,
  second_color: DEEMA_BRAND.highlight,
  text_color: DEEMA_BRAND.textOnDark,
};

/** Keep API text_color when present; always force brand main + second. */
export function mergeWithBrandPalette(
  palette: AppSettingsColorPalette | undefined,
  brand: AppSettingsColorPalette,
): AppSettingsColorPalette {
  return {
    ...palette,
    main_color: brand.main_color,
    second_color: brand.second_color,
    text_color: palette?.text_color?.trim() || brand.text_color,
  };
}
