import { useEffect, useRef } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  useCurrencies,
  useDefaultCurrency,
  useMyCurrency,
} from "@/features/account/hooks/useCurrencies";
import { useAppSettings } from "@/features/account/hooks/useAppSettings";
import type { CurrencyItem } from "@/features/account/types";
import {
  readExplicitCurrencyPreference,
} from "@/shared/lib/displayCurrencyStorage";
import { useAuthStore } from "@/store/auth";

function isCurrencyActive(item: Pick<CurrencyItem, "is_active">): boolean {
  // Older payloads omit `is_active` — treat as active.
  return item.is_active !== false;
}

function pickAdminDefaultFromList(
  items: CurrencyItem[],
): CurrencyItem | undefined {
  const active = items.filter(isCurrencyActive);
  return active.find((c) => c.is_default) ?? active[0] ?? items[0];
}

type AdminDefaultSource = Pick<CurrencyItem, "code" | "symbol" | "is_active">;

/**
 * Resolves storefront display currency:
 *   userPreference (local or account, if still active)
 *   ?? admin is_default from settings.default_currency
 *      / GET /user/currencies/default
 *      / list is_default
 *
 * Mount once under CurrencyProvider + QueryClientProvider (see App.tsx).
 */
export function useDisplayCurrencyBootstrap() {
  const token = useAuthStore((s) => s.token);
  const { data: settings } = useAppSettings();
  const { data: defaultCurrency } = useDefaultCurrency();
  const { data: currencies } = useCurrencies();
  const { data: myCurrency, isSuccess: myCurrencyReady } = useMyCurrency();
  const { currency, hasUserPreference, setCurrency, clearUserPreference } =
    useCurrency();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const fromSettings = settings?.default_currency;
    const fromDefaultEndpoint = defaultCurrency;
    const fromList = currencies?.length
      ? pickAdminDefaultFromList(currencies)
      : undefined;

    const adminDefault: AdminDefaultSource | undefined =
      (fromSettings?.code ? fromSettings : undefined) ??
      (fromDefaultEndpoint?.code ? fromDefaultEndpoint : undefined) ??
      fromList;

    const activeByCode = new Map(
      (currencies ?? [])
        .filter(isCurrencyActive)
        .map((c) => [c.code.toUpperCase(), c] as const),
    );

    const applyAdminDefault = () => {
      if (!adminDefault?.code || adminDefault.is_active === false) return;
      const key = `admin:${adminDefault.code}:${adminDefault.symbol ?? ""}`;
      if (lastKey.current === key && currency === adminDefault.code) return;
      setCurrency(adminDefault.code, adminDefault.symbol, {
        fromAccount: true,
        asPreference: false,
      });
      lastKey.current = key;
    };

    const applyPreference = (code: string, symbol?: string | null) => {
      // Prefer live active list; if list not loaded yet, trust the preference code.
      const match = activeByCode.get(code.toUpperCase());
      if (currencies?.length && !match) {
        clearUserPreference();
        applyAdminDefault();
        return;
      }
      const resolvedCode = match?.code ?? code;
      const resolvedSymbol = match?.symbol ?? symbol;
      const key = `pref:${resolvedCode}:${resolvedSymbol ?? ""}`;
      if (lastKey.current === key && currency === resolvedCode) return;
      setCurrency(resolvedCode, resolvedSymbol ?? undefined, {
        fromAccount: true,
        asPreference: true,
      });
      lastKey.current = key;
    };

    // Logged-in: account currency is the preference source of truth.
    if (token) {
      if (!myCurrencyReady) return;
      if (myCurrency?.code && myCurrency.is_active !== false) {
        applyPreference(myCurrency.code, myCurrency.symbol);
        return;
      }
      // Missing / inactive account currency → admin default (not a sticky pref).
      clearUserPreference();
      applyAdminDefault();
      return;
    }

    // Guest with an explicit local preference.
    const localPref = readExplicitCurrencyPreference();
    if (hasUserPreference && localPref?.code) {
      applyPreference(localPref.code, localPref.symbol);
      return;
    }

    // First visit / no preference → admin default (settings / default endpoint / list).
    applyAdminDefault();
  }, [
    token,
    settings?.default_currency,
    defaultCurrency,
    currencies,
    myCurrencyReady,
    myCurrency?.code,
    myCurrency?.symbol,
    myCurrency?.is_active,
    currency,
    hasUserPreference,
    setCurrency,
    clearUserPreference,
  ]);
}

/** @deprecated Prefer useDisplayCurrencyBootstrap */
export function useCurrencyFromAccount() {
  useDisplayCurrencyBootstrap();
}
