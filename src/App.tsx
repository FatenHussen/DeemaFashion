import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { useScrollToTop } from "@/shared/hooks/useScrollToTop";
import { useTrackShoppingPlace } from "@/shared/hooks/useTrackShoppingPlace";
import { useThemeFromApi } from "@/shared/hooks/useThemeFromApi";
import { useDisplayCurrencyBootstrap } from "@/shared/hooks/useDisplayCurrencyBootstrap";
import { useCartServerSync } from "@/features/cart/hooks/useCartServerSync";
import NotificationToast from "@/components/NotificationToast";
import useFirebaseNotifications from "@/hooks/useFirebaseNotifications";
import { PopupProvider } from "@/features/popup/providers/PopupProvider";
import { BootGate } from "@/shared/component/loading";
import "@/i18n/config";

type AppProps = {
  children?: React.ReactNode;
};

/** Loads API palettes into ThemeContext (must be under ThemeProvider + QueryClient). */
function ThemeFromApiSync() {
  useThemeFromApi();
  return null;
}

/**
 * displayCurrency = userPreference ?? admin is_default
 * (must be under CurrencyProvider + QueryClient).
 */
function DisplayCurrencyBootstrap() {
  useDisplayCurrencyBootstrap();
  return null;
}

/** Pull account cart into local store when logged in (cross-device). */
function CartServerSync() {
  useCartServerSync();
  return null;
}

export default function App({ children }: AppProps) {
  useScrollToTop();
  useTrackShoppingPlace();
  const {
    notification,
    dismissNotification,
    handleNotificationClick,
  } = useFirebaseNotifications();

  return (
    <LanguageProvider>
      <CurrencyProvider>
        <DisplayCurrencyBootstrap />
        <CartServerSync />
        <ThemeProvider>
          <ThemeFromApiSync />
          <BootGate>
            <PopupProvider>
              {children}
            </PopupProvider>
          </BootGate>
          <NotificationToast
            notification={notification}
            onClose={dismissNotification}
            onClick={handleNotificationClick}
          />
        </ThemeProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
