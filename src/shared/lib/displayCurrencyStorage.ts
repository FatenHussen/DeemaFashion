/**
 * Display-currency persistence for the storefront.
 *
 * Rules (see WEBSITE_CURRENCY_DISPLAY_REQUIREMENTS.md):
 * - Admin `is_default` is the baseline for anyone without a preference.
 * - An explicit user/account choice is stored separately and survives admin changes.
 * - Never treat a hardcoded SYP/USD as the permanent product default.
 */

export const DISPLAY_CURRENCY_CODE_KEY = "display_currency_code";
export const DISPLAY_CURRENCY_SYMBOL_KEY = "display_currency_symbol";
/** "1" when the visitor/account explicitly chose a display currency. */
export const DISPLAY_CURRENCY_CHOSEN_KEY = "display_currency_chosen";
/** Legacy chosen flag from earlier storefront builds. */
const LEGACY_CURRENCY_CHOSEN_KEY = "currencyChosenByUser";

/** Last-resort glyph map while the currencies API is still loading / failed. */
export const CURRENCY_SYMBOL_FALLBACKS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  SYP: "ل.س",
  AED: "د.إ",
  SAR: "ر.س",
  EGP: "ج.م",
};

/** Temporary only — replaced as soon as admin default (or preference) resolves. */
export const BOOTSTRAP_FALLBACK_CODE = "USD";

export type StoredDisplayCurrency = {
  code: string;
  symbol: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readDisplayCurrencyCode(): string | null {
  if (!canUseStorage()) return null;
  try {
    return (
      localStorage.getItem(DISPLAY_CURRENCY_CODE_KEY) ||
      localStorage.getItem("currency") ||
      null
    );
  } catch {
    return null;
  }
}

export function hasExplicitCurrencyPreference(): boolean {
  if (!canUseStorage()) return false;
  try {
    if (localStorage.getItem(DISPLAY_CURRENCY_CHOSEN_KEY) === "1") return true;
    // Migrate legacy flag once so existing choices survive the key rename.
    if (localStorage.getItem(LEGACY_CURRENCY_CHOSEN_KEY) === "1") {
      localStorage.setItem(DISPLAY_CURRENCY_CHOSEN_KEY, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function readExplicitCurrencyPreference(): StoredDisplayCurrency | null {
  if (!hasExplicitCurrencyPreference()) return null;
  const code = readDisplayCurrencyCode();
  if (!code) return null;
  try {
    const symbol =
      localStorage.getItem(DISPLAY_CURRENCY_SYMBOL_KEY) ||
      localStorage.getItem("currencySymbol") ||
      CURRENCY_SYMBOL_FALLBACKS[code] ||
      code;
    return { code, symbol };
  } catch {
    return { code, symbol: CURRENCY_SYMBOL_FALLBACKS[code] || code };
  }
}

export function writeDisplayCurrency(
  code: string,
  symbol: string,
  options?: { asPreference?: boolean },
): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(DISPLAY_CURRENCY_CODE_KEY, code);
    localStorage.setItem(DISPLAY_CURRENCY_SYMBOL_KEY, symbol);
    // Keep legacy keys in sync for older readers.
    localStorage.setItem("currency", code);
    localStorage.setItem("currencySymbol", symbol);
    if (options?.asPreference) {
      localStorage.setItem(DISPLAY_CURRENCY_CHOSEN_KEY, "1");
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearExplicitCurrencyPreference(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(DISPLAY_CURRENCY_CHOSEN_KEY);
    localStorage.removeItem(LEGACY_CURRENCY_CHOSEN_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveSymbol(code: string, symbol?: string | null): string {
  return symbol?.trim() || CURRENCY_SYMBOL_FALLBACKS[code] || code;
}
