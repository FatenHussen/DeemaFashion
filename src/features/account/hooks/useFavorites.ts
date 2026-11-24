import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { favoritesApi } from "../api/favoritesApi";
import type { FavoriteItem, FavoriteType, ToggleFavoritePayload } from "../types";

export function useFavorites(type: FavoriteType, enabled = true) {
    return useQuery({
        queryKey: queryKeys.favorites.list(type),
        enabled,
        queryFn: () => favoritesApi.getFavorites(type),
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
    });
}

export type WishlistFiltersParams = {
    shopId?: number;
    categoryId?: number;
    type?: FavoriteType;
};

export function useAllFavorites(params?: WishlistFiltersParams, enabled = true) {
    const queryParams = {
        shop_id: params?.shopId,
        category_id: params?.categoryId,
    };
    return useQuery({
        queryKey: [
            "favorites",
            "list",
            params?.type ?? null,
            params?.shopId ?? null,
            params?.categoryId ?? null,
        ],
        enabled,
        queryFn: () => favoritesApi.getFavorites(params?.type, queryParams),
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
    });
}

/** API may send boolean or 0/1 for `is_favorite`. */
export function coerceFavoriteFlag(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    return undefined;
}

/**
 * Resolve heart state for a product card.
 * Prefer optimistic UI, then the favorites list (survives refresh when list
 * endpoints omit / reset `is_favorite`), then the item's own flag.
 */
export function resolveIsFavorite(options: {
    id: number;
    itemFlag?: unknown;
    favoriteIds: Iterable<number> | ReadonlySet<number>;
    optimistic?: boolean;
}): boolean {
    if (typeof options.optimistic === "boolean") return options.optimistic;
    const ids =
        options.favoriteIds instanceof Set
            ? options.favoriteIds
            : new Set(options.favoriteIds);
    if (ids.has(Number(options.id))) return true;
    return coerceFavoriteFlag(options.itemFlag) === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Recursively set `is_favorite` on any object whose `id` matches the product id.
 * Handles product details wrappers, infinite pages, and plain item arrays.
 */
function patchFavoriteInData(
    value: unknown,
    productId: number,
    isFavorite: boolean,
): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) =>
            patchFavoriteInData(entry, productId, isFavorite),
        );
    }
    if (!isRecord(value)) return value;

    let changed = false;
    const next: Record<string, unknown> = { ...value };

    if (
        Number(value.id) === productId &&
        ("is_favorite" in value || "name" in value || "price" in value)
    ) {
        if (coerceFavoriteFlag(value.is_favorite) !== isFavorite) {
            next.is_favorite = isFavorite;
            changed = true;
        }
    }

    if (isRecord(value.data) || Array.isArray(value.data)) {
        const patchedData = patchFavoriteInData(
            value.data,
            productId,
            isFavorite,
        );
        if (patchedData !== value.data) {
            next.data = patchedData;
            changed = true;
        }
    }

    for (const key of Object.keys(value)) {
        if (key === "data") continue;
        const child = value[key];
        if (Array.isArray(child) || isRecord(child)) {
            const patchedChild = patchFavoriteInData(
                child,
                productId,
                isFavorite,
            );
            if (patchedChild !== child) {
                next[key] = patchedChild;
                changed = true;
            }
        }
    }

    return changed ? next : value;
}

function readCurrentFavorite(
    value: unknown,
    productId: number,
): boolean | undefined {
    if (Array.isArray(value)) {
        for (const entry of value) {
            const found = readCurrentFavorite(entry, productId);
            if (found !== undefined) return found;
        }
        return undefined;
    }
    if (!isRecord(value)) return undefined;
    if (Number(value.id) === productId) {
        const flag = coerceFavoriteFlag(value.is_favorite);
        if (flag !== undefined) return flag;
    }
    if (isRecord(value.data) || Array.isArray(value.data)) {
        const nested = readCurrentFavorite(value.data, productId);
        if (nested !== undefined) return nested;
    }
    for (const key of Object.keys(value)) {
        if (key === "data") continue;
        const child = value[key];
        if (Array.isArray(child) || isRecord(child)) {
            const found = readCurrentFavorite(child, productId);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

function applyFavoriteToProductCaches(
    queryClient: QueryClient,
    productId: number,
    isFavorite: boolean,
) {
    const matches = queryClient.getQueriesData<unknown>({
        predicate: (query) => {
            const key = query.queryKey;
            if (!Array.isArray(key) || key.length === 0) return false;
            const root = String(key[0]);
            return (
                root === "product" ||
                root === "products" ||
                root === "brands" ||
                root === "shop" ||
                root === "sections" ||
                root === "home" ||
                root === "search" ||
                root === "category" ||
                root === "categories"
            );
        },
    });

    matches.forEach(([queryKey, data]) => {
        if (data == null) return;
        const patched = patchFavoriteInData(data, productId, isFavorite);
        if (patched !== data) {
            queryClient.setQueryData(queryKey as QueryKey, patched);
        }
    });
}

/** Keep wishlist id lists in sync so home hearts that fall back to baseIds stay filled. */
function applyFavoriteToFavoritesLists(
    queryClient: QueryClient,
    type: FavoriteType,
    productId: number,
    isFavorite: boolean,
) {
    const matches = queryClient.getQueriesData<FavoriteItem[]>({
        queryKey: ["favorites"],
    });

    matches.forEach(([queryKey, data]) => {
        if (!Array.isArray(data)) return;
        // Only touch list caches that match this type (or untyped "all" lists).
        const keyType = Array.isArray(queryKey) ? queryKey[2] : undefined;
        if (keyType != null && keyType !== type) return;

        const exists = data.some((item) => Number(item.id) === productId);
        if (isFavorite && !exists) {
            queryClient.setQueryData(queryKey as QueryKey, [
                ...data,
                { id: productId, is_favorite: true } as FavoriteItem,
            ]);
            return;
        }
        if (!isFavorite && exists) {
            queryClient.setQueryData(
                queryKey as QueryKey,
                data.filter((item) => Number(item.id) !== productId),
            );
        }
    });
}

function resolveNextFavorite(
    queryClient: QueryClient,
    productId: number,
    preferred?: boolean,
): boolean {
    if (typeof preferred === "boolean") return preferred;

    const detailMatches = queryClient.getQueriesData<unknown>({
        queryKey: ["product", "details"],
        predicate: (query) => query.queryKey[2] === productId,
    });
    for (const [, data] of detailMatches) {
        const current = readCurrentFavorite(data, productId);
        if (typeof current === "boolean") return !current;
    }

    const listMatches = queryClient.getQueriesData<unknown>({
        predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && String(key[0]) === "products";
        },
    });
    for (const [, data] of listMatches) {
        const current = readCurrentFavorite(data, productId);
        if (typeof current === "boolean") return !current;
    }

    const sectionMatches = queryClient.getQueriesData<unknown>({
        queryKey: ["sections"],
    });
    for (const [, data] of sectionMatches) {
        const current = readCurrentFavorite(data, productId);
        if (typeof current === "boolean") return !current;
    }

    const favoriteMatches = queryClient.getQueriesData<FavoriteItem[]>({
        queryKey: queryKeys.favorites.list("product"),
    });
    for (const [, data] of favoriteMatches) {
        if (!Array.isArray(data)) continue;
        return !data.some((item) => Number(item.id) === productId);
    }

    return true;
}

export type ToggleFavoriteVariables = ToggleFavoritePayload & {
    /** UI-known next state — avoids guessing from stale list caches. */
    next_is_favorite?: boolean;
};

export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ next_is_favorite: _next, ...payload }: ToggleFavoriteVariables) =>
            favoritesApi.toggleFavorite(payload),
        onMutate: async (variables) => {
            if (variables?.id == null) return undefined;

            const productId = Number(variables.id);
            const type = variables.type ?? "product";

            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["products"] }),
                queryClient.cancelQueries({ queryKey: ["product"] }),
                queryClient.cancelQueries({ queryKey: ["sections"] }),
                queryClient.cancelQueries({ queryKey: ["favorites"] }),
            ]);

            const next = resolveNextFavorite(
                queryClient,
                productId,
                variables.next_is_favorite,
            );

            if (type === "product") {
                applyFavoriteToProductCaches(queryClient, productId, next);
            }
            applyFavoriteToFavoritesLists(queryClient, type, productId, next);

            return { productId, type, previous: !next, next };
        },
        onError: (_err, variables, context) => {
            if (!context || variables?.id == null) return;
            const productId = Number(variables.id);
            if (context.type === "product") {
                applyFavoriteToProductCaches(
                    queryClient,
                    productId,
                    context.previous,
                );
            }
            applyFavoriteToFavoritesLists(
                queryClient,
                context.type,
                productId,
                context.previous,
            );
        },
        onSuccess: (res, variables, context) => {
            if (variables?.id == null) return;

            const productId = Number(variables.id);
            const type = variables.type ?? "product";
            const fromApi = coerceFavoriteFlag(res?.data?.is_favorite);
            const next =
                typeof fromApi === "boolean"
                    ? fromApi
                    : (context?.next ?? variables.next_is_favorite);

            if (typeof next === "boolean") {
                if (type === "product") {
                    applyFavoriteToProductCaches(queryClient, productId, next);
                }
                applyFavoriteToFavoritesLists(
                    queryClient,
                    type,
                    productId,
                    next,
                );
            }

            // Refresh wishlist lists; product/section hearts are already patched above.
            void queryClient.invalidateQueries({
                queryKey: queryKeys.favorites.all(),
            });
        },
    });
}
