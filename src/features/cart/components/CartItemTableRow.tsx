import { Link } from "react-router-dom";
import { HiMinus, HiPlus, HiTrash } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/shared/lib/utils";
import PriceBlock from "@/shared/component/PriceBlock";
import {
    GradientTableRow,
    GradientTableCell,
} from "@/shared/component/table";
import { toNum } from "../utils";
import type { CartItem } from "../types";

type CartItemTableRowProps = {
    item: CartItem;
    previewPrice?: { price: number; priceBeforeDiscount?: number };
    displayName?: string;
    displayVariant?: string[];
    displaySku?: string | null;
    productHref?: string;
    canEditQuantity?: boolean;
    isLast?: boolean;
    onQuantityChange: (itemId: number | string, quantity: number) => void;
    onRemove: (itemId: number | string) => void;
};

function resolveVariantText(
    item: CartItem,
    displayVariant?: string[],
): string {
    if (displayVariant?.length) return displayVariant.join(" · ");
    if (item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0) {
        return Object.values(item.selectedAttributes).join(" · ");
    }
    return [item.size, item.color, item.type].filter(Boolean).join(" · ");
}

export default function CartItemTableRow({
    item,
    previewPrice,
    displayName,
    displayVariant,
    displaySku,
    productHref,
    canEditQuantity = true,
    isLast = false,
    onQuantityChange,
    onRemove,
}: CartItemTableRowProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { formatPrice } = useCurrency();

    const priceNum =
        previewPrice?.price ?? (item.priceNumeric ?? toNum(item.price));
    const priceBeforeNum =
        previewPrice?.priceBeforeDiscount != null &&
        previewPrice.priceBeforeDiscount > (previewPrice.price ?? 0)
            ? previewPrice.priceBeforeDiscount
            : item.originalPrice
              ? toNum(item.originalPrice)
              : undefined;
    const hasUnitDiscount =
        priceBeforeNum != null && priceBeforeNum > priceNum;
    const unitPrice = formatPrice(priceNum);
    const lineTotal = formatPrice(priceNum * item.quantity);
    const lineOriginal =
        hasUnitDiscount && priceBeforeNum != null
            ? formatPrice(priceBeforeNum * item.quantity)
            : undefined;

    const title = displayName ?? item.name;
    const variantText = resolveVariantText(item, displayVariant);
    const sku = displaySku?.trim() || item.sku?.trim() || "—";

    const handleDecrease = () => {
        onQuantityChange(item.id, Math.max(1, item.quantity - 1));
    };

    const handleIncrease = () => {
        onQuantityChange(item.id, item.quantity + 1);
    };

    const titleClassName = cn(
        "block text-sm font-semibold leading-snug text-custom-primary",
        productHref && "hover:text-[color:var(--color-main)] transition-colors",
    );

    return (
        <GradientTableRow isLast={isLast}>
            <GradientTableCell align="left">
                <div className="flex items-start gap-3 min-w-[12rem]">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-custom-muted ring-1 ring-[color:color-mix(in_srgb,var(--color-border-primary)_80%,transparent)]">
                        {item.image ? (
                            <img
                                src={item.image}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        {productHref ? (
                            <Link to={productHref} className={titleClassName}>
                                {title}
                            </Link>
                        ) : (
                            <h3 className={titleClassName}>{title}</h3>
                        )}
                        {item.store ? (
                            <p className="mt-0.5 text-xs text-custom-secondary truncate">
                                {item.store}
                            </p>
                        ) : null}
                    </div>
                </div>
            </GradientTableCell>

            <GradientTableCell align="center">
                <span className="text-sm text-custom-primary">
                    {variantText || "—"}
                </span>
            </GradientTableCell>

            <GradientTableCell align="center">
                <span className="text-sm tabular-nums text-custom-secondary" dir="ltr">
                    {sku}
                </span>
            </GradientTableCell>

            <GradientTableCell align="right">
                <PriceBlock
                    price={unitPrice}
                    originalPrice={
                        hasUnitDiscount && priceBeforeNum != null
                            ? formatPrice(priceBeforeNum)
                            : undefined
                    }
                    size="sm"
                    align="end"
                />
            </GradientTableCell>

            <GradientTableCell align="center">
                <div
                    className="inline-flex items-center rounded-lg border border-custom-primary bg-custom-card"
                    role="group"
                    aria-label={t("cart.quantity")}
                >
                    <button
                        type="button"
                        onClick={canEditQuantity ? handleDecrease : undefined}
                        disabled={!canEditQuantity || item.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center text-custom-secondary transition-colors hover:bg-custom-hover disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="flex h-8 w-8 items-center justify-center text-custom-secondary transition-colors hover:bg-custom-hover disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={t("cart.increaseQuantity")}
                    >
                        <HiPlus className="h-3.5 w-3.5" />
                    </button>
                </div>
            </GradientTableCell>

            <GradientTableCell align="right">
                <PriceBlock
                    price={lineTotal}
                    originalPrice={lineOriginal}
                    size="sm"
                    align="end"
                />
            </GradientTableCell>

            <GradientTableCell align="center" className="w-12">
                {canEditQuantity ? (
                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-custom-tertiary transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)] hover:text-[color:var(--color-error)]",
                            isRTL ? "mr-auto" : "ml-auto",
                        )}
                        aria-label={t("cart.removeItem")}
                    >
                        <HiTrash className="h-4 w-4" />
                    </button>
                ) : null}
            </GradientTableCell>
        </GradientTableRow>
    );
}
