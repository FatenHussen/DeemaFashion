import type { CartExtraLine, CartItem, CartType } from "../types";
import { toNum } from "../utils";
import { normalizeCartExtras } from "../utils/cartExtras";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readText(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
}

function readOptionalId(value: unknown): number | undefined {
    if (value == null || value === "") return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function readQuantity(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function readMoneyAmount(value: unknown): number {
    if (isRecord(value) && value.amount != null) return toNum(value.amount);
    return toNum(value);
}

function readMoneyFormatted(value: unknown, amount: number): string {
    if (isRecord(value) && typeof value.formatted === "string" && value.formatted.trim()) {
        return value.formatted.trim();
    }
    return amount ? String(amount) : "";
}

function readExtras(value: unknown): CartExtraLine[] | undefined {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    if (value.every((v) => typeof v === "number" || typeof v === "string")) {
        return normalizeCartExtras(
            value.map((id) => ({ id: Number(id), quantity: 1 })),
        );
    }
    return normalizeCartExtras(
        value
            .map((row) => {
                if (!isRecord(row)) return null;
                const id = readOptionalId(row.id ?? row.extra_id ?? row.extra_detail_id);
                if (id == null) return null;
                return {
                    id,
                    quantity: Math.max(1, readQuantity(row.quantity) || 1),
                };
            })
            .filter((row): row is CartExtraLine => row != null),
    );
}

function readVariantLabel(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        const parts = value
            .map((entry) => {
                if (typeof entry === "string") return entry.trim();
                if (!isRecord(entry)) return "";
                const attr = readText(entry.attribute ?? entry.name ?? entry.attr_name);
                const val = readText(entry.value ?? entry.var_name ?? entry.option);
                if (attr && val) return `${attr}: ${val}`;
                return val || attr;
            })
            .filter(Boolean);
        return parts.length ? parts.join(", ") : undefined;
    }
    const text = readText(value);
    return text || undefined;
}

/** Accept items at several common response shapes. */
export function extractServerCartItems(payload: unknown): unknown[] {
    if (!isRecord(payload)) return [];

    const nested = isRecord(payload.data) ? payload.data : null;
    const cart = isRecord(payload.cart)
        ? payload.cart
        : nested && isRecord(nested.cart)
          ? nested.cart
          : null;

    const candidates = [
        payload.items,
        payload.cart_items,
        nested?.items,
        nested?.cart_items,
        cart?.items,
        cart?.cart_items,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }
    return [];
}

export function extractServerCartType(payload: unknown): CartType | undefined {
    if (!isRecord(payload)) return undefined;
    const nested = isRecord(payload.data) ? payload.data : null;
    const raw = payload.cart_type ?? nested?.cart_type;
    if (
        raw === "default" ||
        raw === "recipe" ||
        raw === "basket" ||
        raw === "schedule_admin_cart"
    ) {
        return raw;
    }
    return undefined;
}

export function mapServerCartItem(raw: unknown, index: number): CartItem | null {
    if (!isRecord(raw)) return null;

    const shopProductVariantId = readOptionalId(
        raw.shop_product_variant_id ??
            raw.shopProductVariantId ??
            raw.variant_id ??
            (isRecord(raw.shop_product_variant) ? raw.shop_product_variant.id : undefined),
    );
    if (shopProductVariantId == null) return null;

    const quantity = readQuantity(raw.quantity ?? raw.qty);
    if (quantity <= 0) return null;

    const unitRaw =
        raw.unit_price ??
        raw.price_after_discount ??
        raw.price ??
        raw.final_price ??
        (isRecord(raw.unit_price_money) ? raw.unit_price_money : undefined);
    const unitAmount = readMoneyAmount(unitRaw);
    const unitFormatted = readMoneyFormatted(unitRaw, unitAmount);
    const lineRaw = raw.line_total ?? raw.subtotal ?? raw.total;
    const lineAmount =
        lineRaw != null ? readMoneyAmount(lineRaw) : unitAmount * quantity;
    const lineFormatted =
        lineRaw != null ? readMoneyFormatted(lineRaw, lineAmount) : unitFormatted;

    const serverItemId = readOptionalId(raw.id ?? raw.cart_item_id ?? raw.cart_id);
    const shopId = readOptionalId(
        raw.shop_id ?? raw.store_id ?? (isRecord(raw.shop) ? raw.shop.id : undefined),
    );
    const productId = readOptionalId(raw.product_id ?? raw.productId);
    const note = readText(raw.note) || undefined;
    const name =
        readText(raw.product_name) ||
        readText(raw.name) ||
        readText(raw.title) ||
        "";
    const image =
        readText(raw.product_image) ||
        readText(raw.image) ||
        readText(raw.thumbnail) ||
        "";
    const store =
        readText(raw.shop_name) ||
        (isRecord(raw.shop) ? readText(raw.shop.name) : "") ||
        undefined;
    const sku = readText(raw.sku) || undefined;
    const modelNumber =
        readText(raw.model_number) || readText(raw.model) || undefined;
    const availableQuantity = readOptionalId(
        raw.available_quantity ?? raw.stock ?? raw.qty_available,
    );
    const extras = readExtras(raw.extras ?? raw.extra_details);
    const variantLabel = readVariantLabel(
        raw.variant ?? raw.variant_attributes ?? raw.attributes,
    );
    const isInstant =
        raw.is_instant_delivery === true ||
        raw.is_instant_delivery === 1 ||
        raw.is_instant_delivery === "1";

    return {
        id: serverItemId != null ? `cart-${serverItemId}` : `spv-${shopProductVariantId}-${index}`,
        serverItemId,
        name,
        image,
        price: unitFormatted || String(unitAmount || 0),
        priceNumeric: unitAmount || undefined,
        quantity,
        subtotal: lineFormatted || String(lineAmount || 0),
        storeId: shopId ?? 0,
        shopId,
        store,
        productId,
        shop_product_variant_id: shopProductVariantId,
        sku,
        modelNumber,
        availableQuantity,
        size: variantLabel,
        extras,
        note,
        is_instant_delivery: isInstant || undefined,
    };
}

export type ParsedServerCart = {
    items: CartItem[];
    cart_type?: CartType;
};

export function parseServerCart(payload: unknown): ParsedServerCart {
    const items = extractServerCartItems(payload)
        .map((row, index) => mapServerCartItem(row, index))
        .filter((row): row is CartItem => row != null);

    return {
        items,
        cart_type: extractServerCartType(payload),
    };
}
