import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { syncCartWithServer } from "../api/cartApi";

function waitForPersistHydration(
    store: {
        persist: {
            hasHydrated: () => boolean;
            onFinishHydration: (fn: () => void) => () => void;
        };
    },
): Promise<void> {
    if (store.persist.hasHydrated()) return Promise.resolve();
    return new Promise((resolve) => {
        const unsub = store.persist.onFinishHydration(() => {
            unsub();
            resolve();
        });
    });
}

/**
 * When the user is logged in, pull `/user/cart` into the local store so the
 * cart follows the account across devices (laptop ↔ mobile).
 * Mount once under the authenticated app shell (see App.tsx).
 */
export function useCartServerSync() {
    const token = useAuthStore((s) => s.token);
    const ranForToken = useRef<string | null>(null);

    useEffect(() => {
        if (!token) {
            ranForToken.current = null;
            return;
        }

        let cancelled = false;
        let focusTimer: ReturnType<typeof setTimeout> | null = null;

        const pull = () => {
            void syncCartWithServer();
        };

        void (async () => {
            await Promise.all([
                waitForPersistHydration(useAuthStore),
                waitForPersistHydration(useCartStore),
            ]);
            if (cancelled) return;
            if (ranForToken.current !== token) {
                ranForToken.current = token;
                pull();
            }
        })();

        const onFocus = () => {
            if (document.visibilityState && document.visibilityState !== "visible") {
                return;
            }
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
                if (!cancelled) pull();
            }, 400);
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible") onFocus();
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            if (focusTimer) clearTimeout(focusTimer);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [token]);
}
