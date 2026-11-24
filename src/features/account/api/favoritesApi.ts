import _axios from"@/app/middleware/interceptor";
import { apiRoutes } from"@/utils/apiRoutes";
import type {
 FavoriteItem,
 FavoriteType,
 FavoritesResponse,
 ToggleFavoritePayload,
} from"../types";

export interface FavoritesListParams {
 shop_id?: number;
 category_id?: number;
 page?: number;
 per_page?: number;
}

export const favoritesApi = {
 getFavorites: async (
 type?: FavoriteType,
 params?: FavoritesListParams
 ): Promise<FavoriteItem[]> => {
 const res = await _axios.get<FavoritesResponse>(
 apiRoutes.favorites.list(type, params),
 );
 const raw = res.data.data;
 if (Array.isArray(raw)) return raw;
 if (raw && typeof raw ==="object"&&"items"in raw && Array.isArray(raw.items)) {
 return raw.items;
 }
 return [];
 },

    toggleFavorite: async (payload: ToggleFavoritePayload): Promise<{
 success: boolean;
 data?: { message: string; is_favorite?: boolean };
 }> => {
 const res = await _axios.post<
 | { success: boolean; data: { message: string; is_favorite?: boolean } }
 | { status: boolean; message: string; is_favorite?: boolean; data?: { message?: string; is_favorite?: boolean } }
 >(apiRoutes.favorites.toggle, payload, { skipSuccessToast: true });
 const d = res.data as {
 success?: boolean;
 status?: boolean;
 message?: string;
 is_favorite?: boolean;
 data?: { message?: string; is_favorite?: boolean };
 };
 const nested = d.data;
 const rawFavorite =
 nested?.is_favorite !== undefined ? nested.is_favorite : d.is_favorite;
 const isFavorite =
 typeof rawFavorite === "boolean"
 ? rawFavorite
 : rawFavorite === 1 || rawFavorite === "1"
 ? true
 : rawFavorite === 0 || rawFavorite === "0"
 ? false
 : undefined;
 return {
 success: d.success ?? d.status ?? true,
 data: {
 message: nested?.message ?? d.message ?? "",
 ...(typeof isFavorite === "boolean" ? { is_favorite: isFavorite } : {}),
 },
 };
 },
};
