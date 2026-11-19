import _axios from "@/app/middleware/interceptor";
import { apiRoutes } from "@/utils/apiRoutes";
import type {
 CurrenciesListResponse,
 DefaultCurrencyResponse,
 MyCurrencyResponse,
 UpdateCurrencyPayload,
 GenericApiResponse,
} from "../types";

export const _CurrencyApi = {
 /**
 * Get list of available currencies (active only from API).
 */
 getCurrencies: async (page?: number): Promise<CurrenciesListResponse> => {
  const url = page
   ? `${apiRoutes.currencies.list}?page=${page}`
   : apiRoutes.currencies.list;
  const response = await _axios.get<CurrenciesListResponse>(url);
  return response.data;
 },

 /**
 * Admin `is_default` display currency (first visit / no preference).
 */
 getDefaultCurrency: async (): Promise<DefaultCurrencyResponse> => {
  const response = await _axios.get<DefaultCurrencyResponse>(
   apiRoutes.currencies.default,
  );
  return response.data;
 },

 /**
 * Get user's selected currency (or admin default when unset).
 */
 getMyCurrency: async (): Promise<MyCurrencyResponse> => {
  const response = await _axios.get<MyCurrencyResponse>(
   apiRoutes.currencies.myCurrency,
  );
  return response.data;
 },

 /**
 * Update logged-in user's personal currency preference.
 */
 updateCurrency: async (
  payload: UpdateCurrencyPayload,
 ): Promise<GenericApiResponse> => {
  const response = await _axios.post<GenericApiResponse>(
   apiRoutes.currencies.updateCurrency,
   payload,
  );
  return response.data;
 },
};
