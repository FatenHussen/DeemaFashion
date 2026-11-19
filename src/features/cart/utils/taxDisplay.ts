import { pickCurrencyFormatted, type ApiDualCurrencies } from "@/shared/lib/formatApiPrice";
import { toNum } from "../utils";

/** Money object some API versions return instead of a bare number. */
type TaxMoneyObject = {
    amount?: number | string | null;
    formatted?: string | null;
    currencies?: ApiDualCurrencies | null;
};

/** City tax fields from preview or from the snapshot saved on an order. */
export type CityTaxFields = {
    tax?: number | string | TaxMoneyObject | null;
    tax_amount?: number | string | TaxMoneyObject | null;
    tax_amount_formatted?: string | null;
    /** Alias used by some order payloads. */
    tax_formatted?: string | null;
    /**
     * Same tax in each currency, already converted with the dashboard exchange rate.
     * The UI picks the active currency. It does not multiply the rate itself.
     */
    tax_amount_currencies?: ApiDualCurrencies | null;
    tax_rate?: number | string | null;
    /** `percent` or `fixed`. Missing on orders saved before fixed tax existed. */
    tax_type?: string | null;
    tax_value?: number | string | null;
};

export type CityTaxLine = {
    /** Parenthetical rate, e.g. `10%`. Absent for a fixed amount. */
    rateLabel?: string;
    /** `tax_amount_formatted` when the API sent one, otherwise the formatted `tax_amount`. */
    amount: string;
};

function hasValue(value: unknown): boolean {
    return value != null && String(value).trim() !== "";
}

function hasPercentSign(value: string): boolean {
    return value.includes("%") || value.includes("٪");
}

/** Rate text for a percent tax. Does not turn a fixed amount into a percent. */
function asPercentLabel(value: unknown): string | undefined {
    if (!hasValue(value)) return undefined;
    const raw = String(value).trim();
    if (hasPercentSign(raw)) {
        return toNum(raw) > 0 ? raw : undefined;
    }
    if (toNum(raw) <= 0) return undefined;
    return `${raw}%`;
}

function rateLabelFor(fields: CityTaxFields): string | undefined {
    const type = String(fields.tax_type ?? "").trim().toLowerCase();
    if (type === "fixed") return undefined;
    if (type === "percent" || type === "percentage") {
        return asPercentLabel(fields.tax_rate) ?? asPercentLabel(fields.tax_value);
    }
    // Older orders have no tax_type. Show a rate only when the snapshot already includes %.
    if (hasValue(fields.tax_rate) && hasPercentSign(String(fields.tax_rate))) {
        return asPercentLabel(fields.tax_rate);
    }
    return undefined;
}

function asMoneyObject(value: unknown): TaxMoneyObject | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as TaxMoneyObject;
}

function amountSource(fields: CityTaxFields): unknown {
    const nested = asMoneyObject(fields.tax_amount);
    if (nested?.amount != null && String(nested.amount).trim() !== "") return nested.amount;
    if (hasValue(fields.tax_amount) && !nested) return fields.tax_amount;
    const taxNested = asMoneyObject(fields.tax);
    if (taxNested?.amount != null && String(taxNested.amount).trim() !== "") return taxNested.amount;
    if (hasValue(fields.tax) && !taxNested) return fields.tax;
    return undefined;
}

/**
 * Display line for city tax.
 * The amount is the API value for the active currency (`tax_amount_currencies`,
 * then `tax_amount_formatted`, then `tax_amount`). The dashboard exchange rate
 * is already applied by the API. This does not multiply a rate locally.
 * Returns nothing when the amount is missing or zero — the row should be hidden.
 */
export function resolveCityTaxLine(
    fields: CityTaxFields | null | undefined,
    formatPrice: (amount: number) => string,
    currencyCode?: string | null,
): CityTaxLine | undefined {
    if (!fields) return undefined;

    const nested = asMoneyObject(fields.tax_amount) ?? asMoneyObject(fields.tax);
    const fromMap = pickCurrencyFormatted(
        fields.tax_amount_currencies ?? nested?.currencies,
        currencyCode,
    );
    const mappedAmount = fromMap && toNum(fromMap) > 0 ? fromMap : undefined;

    const raw = amountSource(fields);
    const amount = toNum(raw);
    if (!mappedAmount && !(amount > 0)) return undefined;

    const formatted = (fields.tax_amount_formatted ?? fields.tax_formatted ?? nested?.formatted)?.trim();
    const formattedAmount = formatted && toNum(formatted) > 0 ? formatted : undefined;
    const rateLabel = rateLabelFor(fields);

    return {
        ...(rateLabel ? { rateLabel } : {}),
        amount: mappedAmount ?? formattedAmount ?? formatPrice(amount),
    };
}

/** `Tax` or `Tax (10%)` / `الضريبة (10%)`. Fixed tax stays without a percent. */
export function formatCityTaxLabel(taxLabel: string, rateLabel?: string | null): string {
    const rate = rateLabel?.trim();
    if (!rate) return taxLabel;
    return `${taxLabel} (${rate})`;
}
