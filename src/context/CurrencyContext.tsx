import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import i18next from "i18next";
import { formatMoneyAmount, presentMoney } from "@/shared/lib/formatApiPrice";
import { useAuthStore } from "@/store/auth";
import {
  BOOTSTRAP_FALLBACK_CODE,
  clearExplicitCurrencyPreference,
  CURRENCY_SYMBOL_FALLBACKS,
  hasExplicitCurrencyPreference,
  readExplicitCurrencyPreference,
  resolveSymbol,
  writeDisplayCurrency,
} from "@/shared/lib/displayCurrencyStorage";

export type Currency = string;

interface CurrencyState {
  code: string;
  symbol: string;
}

type SetCurrencyOptions = {
  /**
   * Account / bootstrap sync — must not override an in-session manual pick
   * unless the codes differ and we are correcting drift via bootstrap rules.
   */
  fromAccount?: boolean;
  /**
   * When false, apply admin default (or temporary fallback) without marking
   * an explicit user preference. Admin default changes then still apply.
   * Default: true (Settings / user switcher / saved account preference).
   */
  asPreference?: boolean;
};

interface CurrencyContextType {
  currency: Currency;
  currencySymbol: string;
  hasUserPreference: boolean;
  setCurrency: (
    currency: Currency,
    symbol?: string,
    options?: SetCurrencyOptions,
  ) => void;
  clearUserPreference: () => void;
  getCurrencySymbol: () => string;
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function getInitialCurrency(): CurrencyState {
  const preferred = readExplicitCurrencyPreference();
  if (preferred) return preferred;
  // No preference yet — temporary until admin `is_default` bootstrap runs.
  return {
    code: BOOTSTRAP_FALLBACK_CODE,
    symbol: CURRENCY_SYMBOL_FALLBACKS[BOOTSTRAP_FALLBACK_CODE],
  };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyState, setCurrencyState] = useState<CurrencyState>(getInitialCurrency);
  const [hasUserPreference, setHasUserPreference] = useState(
    hasExplicitCurrencyPreference,
  );

  useEffect(() => {
    writeDisplayCurrency(currencyState.code, currencyState.symbol, {
      asPreference: hasUserPreference,
    });
  }, [currencyState, hasUserPreference]);

  /**
   * Blocks stale account refetches from undoing an in-session Settings change.
   * Cleared on auth token change so a new login can sync.
   */
  const pinnedByUser = useRef(false);
  const authToken = useAuthStore((s) => s.token);

  useEffect(() => {
    pinnedByUser.current = false;
  }, [authToken]);

  const setCurrency = useCallback(
    (newCurrency: Currency, symbol?: string, options?: SetCurrencyOptions) => {
      const asPreference = options?.asPreference !== false;
      const fromAccount = Boolean(options?.fromAccount);

      if (fromAccount && pinnedByUser.current && asPreference) return;
      if (!fromAccount && asPreference) pinnedByUser.current = true;

      const resolvedSymbol = resolveSymbol(newCurrency, symbol);
      if (asPreference) {
        setHasUserPreference(true);
      }
      setCurrencyState({ code: newCurrency, symbol: resolvedSymbol });
    },
    [],
  );

  const clearUserPreference = useCallback(() => {
    clearExplicitCurrencyPreference();
    setHasUserPreference(false);
    pinnedByUser.current = false;
  }, []);

  const getCurrencySymbol = () => currencyState.symbol;

  const formatPrice = (amount: number) => {
    const value =
      amount == null || typeof amount !== "number" || Number.isNaN(amount)
        ? 0
        : amount;
    return presentMoney(
      `${currencyState.symbol}${formatMoneyAmount(value, currencyState.code)}`,
      i18next.resolvedLanguage || i18next.language,
    );
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: currencyState.code,
        currencySymbol: currencyState.symbol,
        hasUserPreference,
        setCurrency,
        clearUserPreference,
        getCurrencySymbol,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export function useCurrencyOptional() {
  return useContext(CurrencyContext);
}
