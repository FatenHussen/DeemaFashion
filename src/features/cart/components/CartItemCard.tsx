import { Link } from "react-router-dom";
import { HiMinus, HiPlus, HiTrash } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/shared/lib/utils";
import FormattedPrice from "@/shared/component/FormattedPrice";
import { toNum } from "../utils";
import type { CartItem } from "../types";

type CartItemCardProps = {
    item: CartItem;
    previewPrices?: Map<number, { price: number; priceBeforeDiscount?: number }>;
    previewPrice?: { price: number; priceBeforeDiscount?: number };
    extrasTotal?: string | null;
    note?: string | null;
    image?: string | null;
    displayName?: string;
    displayVariant?: string[];
    displayStore?: string;
    displaySku?: string | null;
    productHref?: string;
    freeQuantity?: number;
    isExcludedFromCoupon?: boolean;
    canEditQuantity?: boolean;
    onQuantityChange: (itemId: number | string, quantity: number) => void;
    onRemove: (itemId: number | string) => void;
};

export default function CartItemCard({
    item,
    previewPrices,
    previewPrice,
    extrasTotal,
    note,
    image,
    displayName,
    displayVariant,
    displayStore,
    displaySku,
    productHref,
    freeQuantity = 0,
    isExcludedFromCoupon = false,
    canEditQuantity = true,
    onQuantityChange,
    onRemove,
}: CartItemCardProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { formatPrice } = useCurrency();

    const preview =
        previewPrice ??
        (item.shop_product_variant_id != null
            ? previewPrices?.get(item.shop_product_variant_id)
            : undefined);
    const priceNum = preview?.price ?? (item.priceNumeric ?? toNum(item.price));
    const unitPrice = formatPrice(priceNum);
    const lineTotal = formatPrice(priceNum * item.quantity);
    const variantText = displayVariant?.length
        ? displayVariant.join(" · ")
        : item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0
          ? Object.values(item.selectedAttributes).join(" · ")
          : undefined;
    const storeName = displayStore ?? item.store;
    const imageSrc = image || item.image;
    const title = displayName ?? item.name;
    const lineNote = note ?? item.note;
    const sku = (displaySku ?? item.sku)?.trim();

    const handleDecrease = () => {
        onQuantityChange(item.id, Math.max(1, item.quantity - 1));
    };

    const handleIncrease = () => {
        onQuantityChange(item.id, item.quantity + 1);
    };

    const titleClassName = cn(
        "block text-[15px] font-semibold leading-snug text-custom-primary",
        productHref && "hover:text-[color:var(--color-main)] transition-colors",
    );

    return (
        <article className="px-4 py-4 sm:px-5 sm:py-5" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex gap-3 sm:gap-4">
                <div className="h-[72px] w-[72px] sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-custom-muted ring-1 ring-[color:color-mix(in_srgb,var(--color-border-primary)_80%,transparent)]">
                    {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="text-[11px] text-custom-tertiary">
                                {t("cart.noImage", "No image")}
                            </span>
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            {productHref ? (
                                <Link to={productHref} className={titleClassName}>
                                    {title}
                                </Link>
                            ) : (
                                <h3 className={titleClassName}>{title}</h3>
                            )}

                            {storeName ? (
                                <p className="mt-1 text-xs text-custom-secondary">
                                    {storeName}
                                </p>
                            ) : null}

                            {sku ? (
                                <p className="mt-1 text-xs text-custom-tertiary" dir="ltr">
                                    <span className="text-custom-secondary">
                                        {t("cart.sku", "SKU")}
                                    </span>{" "}
                                    {sku}
                                </p>
                            ) : item.productId != null ? (
                                <p className="mt-1 text-xs text-custom-tertiary">
                                    {t("cart.productNumber", "Product number")}{" "}
                                    {item.productId}
                                </p>
                            ) : null}

                            {variantText ? (
                                <p className="mt-1 text-xs text-custom-secondary">
                                    {variantText}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                            {canEditQuantity ? (
                                <button
                                    type="button"
                                    onClick={() => onRemove(item.id)}
                                    className="rounded-lg p-1.5 text-custom-tertiary transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)] hover:text-[color:var(--color-error)]"
                                    aria-label={t("cart.removeItem")}
                                >
                                    <HiTrash className="h-4 w-4" />
                                </button>
                            ) : null}

                            <div className="min-w-[7.5rem] space-y-1 text-end">
                                <div>
                                    <p className="text-[11px] text-custom-secondary">
                                        {t("cart.unitPrice", "Unit price")}
                                    </p>
                                    <FormattedPrice
                                        value={unitPrice}
                                        layout="inline"
                                        className="text-sm font-semibold tabular-nums text-custom-primary"
                                    />
                                </div>
                                <p
                                    className="text-xs tabular-nums text-custom-secondary"
                                    dir="ltr"
                                >
                                    <FormattedPrice
                                        value={unitPrice}
                                        layout="inline"
                                        className="tabular-nums"
                                    />
                                    <span className="mx-1">×</span>
                                    <span>{item.quantity}</span>
                                </p>
                                <div>
                                    <p className="text-[11px] text-custom-secondary">
                                        {t("cart.lineTotal", "Total")}
                                    </p>
                                    <FormattedPrice
                                        value={lineTotal}
                                        layout="inline"
                                        className="text-sm font-bold tabular-nums text-[color:var(--color-api-second)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {freeQuantity > 0 && (
                            <span className="rounded-md bg-[color:color-mix(in_srgb,var(--color-success)_12%,var(--color-bg-card))] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
                                {t("cart.free")} × {freeQuantity}
                            </span>
                        )}
                        {isExcludedFromCoupon && (
                            <span className="rounded-md bg-[color:color-mix(in_srgb,var(--color-warning)_14%,var(--color-bg-card))] px-2 py-0.5 text-[11px] font-medium text-[var(--color-warning-dark)]">
                                {t("cart.excludedFromCoupon")}
                            </span>
                        )}
                    </div>

                    {lineNote ? (
                        <p className="mt-2 text-xs text-custom-secondary">
                            {t("cart.note", "Note")}: {lineNote}
                        </p>
                    ) : null}

                    {extrasTotal ? (
                        <p className="mt-1 text-xs text-custom-secondary">
                            {t("cart.extras", "Extras")}: {extrasTotal}
                        </p>
                    ) : null}

                    <div className="mt-3">
                        <div
                            className="inline-flex items-center rounded-lg border border-custom-primary bg-custom-card"
                            role="group"
                            aria-label={t("cart.quantity")}
                        >
                            <button
                                type="button"
                                onClick={canEditQuantity ? handleDecrease : undefined}
                                disabled={!canEditQuantity || item.quantity <= 1}
                                className="flex h-9 w-9 items-center justify-center text-custom-secondary transition-colors hover:bg-custom-hover disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={t("cart.decreaseQuantity")}
                            >
                                <HiMinus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-custom-primary">
                                {item.quantity}
                            </span>
                            <button
                                type="button"
                                onClick={canEditQuantity ? handleIncrease : undefined}
                                disabled={!canEditQuantity}
                                className="flex h-9 w-9 items-center justify-center text-custom-secondary transition-colors hover:bg-custom-hover disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={t("cart.increaseQuantity")}
                            >
                                <HiPlus className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
