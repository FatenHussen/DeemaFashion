import _axios from "@/app/middleware/interceptor";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { apiRoutes } from "@/utils/apiRoutes";
import type { CartItem } from "@/features/cart/types";
import { parseServerCart } from "../lib/parseServerCart";

export type ServerCartItem = {
    shop_product_variant_id: number;
    quantity: number;
    note?: string;
};

export type UpdateCartItemPayload = {
    quantity: number;
    note?: string;
};

const silent = { skipErrorToast: true, skipSuccessToast: true } as const;

function cartItemBody(item: ServerCartItem) {
    const note = item.note?.trim();
    return {
        shop_product_variant_id: item.shop_product_variant_id,
        quantity: item.quantity,
        ...(note ? { note: note.slice(0, 500) } : {}),
    };
}

export function toServerCartItem(item: CartItem): ServerCartItem | null {
    if (item.shop_product_variant_id == null) return null;
    const note = item.note?.trim();
    return {
        shop_product_variant_id: item.shop_product_variant_id,
        quantity: item.quantity,
        ...(note ? { note: note.slice(0, 500) } : {}),
    };
}

function localDefaultBodies(): ServerCartItem[] {
    const local = useCartStore.getState();
    if (local.cart_type !== "default") return [];
    return local.items
        .map(toServerCartItem)
        .filter((item): item is ServerCartItem => item != null);
}

/** GET `/user/cart` — token required. */
export async function getCart<T = unknown>(): Promise<T | null> {
    const token = useAuthStore.getState().token;
    if (!token) return null;
    const response = await _axios.get<T>(apiRoutes.cart.get, silent);
    return response.data;
}

/** POST `/user/cart/items` — no price from the client. Guests skip the call. */
export async function postCartItems(items: ServerCartItem[]): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token || items.length === 0) return;
    await Promise.all(
        items.map((item) =>
            _axios.post(apiRoutes.cart.items, cartItemBody(item), silent),
        ),
    );
}

/** PUT `/user/cart/items/{id}` `{ quantity, note? }` */
export async function updateCartItem(
    id: number | string,
    payload: UpdateCartItemPayload,
): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const note = payload.note?.trim();
    await _axios.put(
        apiRoutes.cart.item(id),
        {
            quantity: payload.quantity,
            ...(note ? { note: note.slice(0, 500) } : {}),
        },
        silent,
    );
}

/** DELETE `/user/cart/items/{id}` */
export async function deleteCartItem(id: number | string): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;
    await _axios.delete(apiRoutes.cart.item(id), silent);
}

/** DELETE `/user/cart` — empty the whole account cart when the route exists. */
export async function clearCartOnServer(): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;
    await _axios.delete(apiRoutes.cart.clear, silent);
}

/**
 * Replace the local default cart with `GET /user/cart` items.
 * Keeps local recipe/basket carts that are not the default server cart.
 */
export async function refreshCartFromServer(): Promise<boolean> {
    const token = useAuthStore.getState().token;
    if (!token) return false;
    if (isServerPullSuppressed()) return false;

    const local = useCartStore.getState();
    if (local.cart_type !== "default") return false;

    const payload = await getCart<unknown>();
    if (payload == null) return false;

    const parsed = parseServerCart(payload);
    if (parsed.items.length === 0) {
        // Avoid wiping a just-added local cart when the POST has not landed yet.
        if (local.items.length > 0) return false;
        return true;
    }

    useCartStore.getState().replaceItems(parsed.items, {
        cart_type: parsed.cart_type ?? "default",
    });
    return true;
}

/** Fire-and-forget add — then pull so line ids exist for later PUT/DELETE. */
export function postCartItemsSafe(items: ServerCartItem[]): void {
    void postCartItems(items)
        .then(() => refreshCartFromServer())
        .catch(() => undefined);
}

export function syncQuantityToServer(item: CartItem, quantity: number): void {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const qty = Math.max(1, quantity);
    if (item.serverItemId != null) {
        void updateCartItem(item.serverItemId, {
            quantity: qty,
            ...(item.note?.trim() ? { note: item.note } : {}),
        }).catch(() => undefined);
        return;
    }
    const body = toServerCartItem({ ...item, quantity: qty });
    if (body) postCartItemsSafe([body]);
}

export function syncRemoveToServer(item: CartItem): void {
    const token = useAuthStore.getState().token;
    if (!token) return;
    if (item.serverItemId != null) {
        void deleteCartItem(item.serverItemId).catch(() => undefined);
        return;
    }
    void (async () => {
        const payload = await getCart<unknown>();
        if (payload == null || item.shop_product_variant_id == null) return;
        const parsed = parseServerCart(payload);
        const matches = parsed.items.filter(
            (row) =>
                row.shop_product_variant_id === item.shop_product_variant_id &&
                row.serverItemId != null,
        );
        await Promise.all(
            matches.map((row) => deleteCartItem(row.serverItemId!)),
        );
    })().catch(() => undefined);
}

/** Skip GET→replace hydration briefly after an order so stale server cart cannot refill. */
let suppressServerPullUntil = 0;

export function suppressCartServerPull(ms = 30000): void {
    suppressServerPullUntil = Date.now() + Math.max(0, ms);
}

function isServerPullSuppressed(): boolean {
    return Date.now() < suppressServerPullUntil;
}

async function deleteServerCartIds(ids: number[]): Promise<void> {
    const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
    if (unique.length === 0) return;
    await Promise.all(
        unique.map((id) => deleteCartItem(id).catch(() => undefined)),
    );
}

/**
 * Wipe the account cart on the server.
 * Prefer `DELETE /user/cart`, then fall back to per-line deletes + verify GET.
 * After a placed order the backend also empties the cart; this is the client backup.
 */
export async function clearServerCartSafe(items?: CartItem[]): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const snapshot = items ?? useCartStore.getState().items;
    try {
        try {
            await clearCartOnServer();
            return;
        } catch {
            /* fall through to per-item deletes */
        }

        const localIds = snapshot
            .map((item) => item.serverItemId)
            .filter((id): id is number => id != null);
        await deleteServerCartIds(localIds);

        for (let pass = 0; pass < 2; pass++) {
            const payload = await getCart<unknown>();
            if (payload == null) return;
            const remaining = parseServerCart(payload)
                .items.map((item) => item.serverItemId)
                .filter((id): id is number => id != null);
            if (remaining.length === 0) return;
            await deleteServerCartIds(remaining);
        }
    } catch {
        /* local clear still proceeds */
    }
}

export type SyncCartOptions = {
    /**
     * Push the device's local default cart before pulling.
     * Use after guest → login so this device's lines join the account cart.
     */
    pushLocalFirst?: boolean;
};

/**
 * Align local cart with the account cart on the server.
 * When the server already has items, it wins (no re-POST) so quantities
 * do not double on every page reload.
 */
export async function syncCartWithServer(
    options: SyncCartOptions = {},
): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;
    if (isServerPullSuppressed()) return;

    const local = useCartStore.getState();
    if (local.cart_type !== "default" && local.items.length > 0) {
        return;
    }

    if (options.pushLocalFirst) {
        const bodies = localDefaultBodies();
        if (bodies.length > 0) {
            try {
                await postCartItems(bodies);
            } catch {
                /* still try to pull */
            }
        }
    }

    try {
        const payload = await getCart<unknown>();
        if (payload == null) return;
        const parsed = parseServerCart(payload);

        if (parsed.items.length > 0) {
            useCartStore.getState().replaceItems(parsed.items, {
                cart_type: parsed.cart_type ?? "default",
            });
            return;
        }

        // Server empty: seed from this device when we still have local lines.
        const bodies = localDefaultBodies();
        if (bodies.length === 0) return;
        await postCartItems(bodies);
        await refreshCartFromServer();
    } catch {
        /* local cart remains usable */
    }
}

/**
 * After login / OTP: push guest lines, then hydrate the account cart
 * (including lines added on other devices).
 */
export function syncLocalCartToServer(): void {
    void syncCartWithServer({ pushLocalFirst: true });
}
