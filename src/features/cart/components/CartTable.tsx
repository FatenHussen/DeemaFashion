import { Link } from "react-router-dom";
import { HiPlus } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { paths } from "@/app/routes/path/paths";
import { continueShoppingPath } from "@/shared/lib/shoppingResume";
import {
    GradientTable,
    GradientTableHeader,
    GradientTableHeaderCell,
    GradientTableBody,
} from "@/shared/component/table";
import CartItemTableRow from "./CartItemTableRow";
import type { CartItem } from "../types";

type RowExtras = {
    previewPrice?: { price: number; priceBeforeDiscount?: number };
    displayName?: string;
    displayVariant?: string[];
    displaySku?: string | null;
    productHref?: string;
};

type CartTableProps = {
    items: CartItem[];
    canEditQuantity?: boolean;
    getRowExtras?: (item: CartItem) => RowExtras;
    onQuantityChange: (itemId: number | string, quantity: number) => void;
    onRemove: (itemId: number | string) => void;
};

export default function CartTable({
    items,
    canEditQuantity = true,
    getRowExtras,
    onQuantityChange,
    onRemove,
}: CartTableProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-3">
            <GradientTable showTitle={false}>
                <GradientTableHeader>
                    <GradientTableHeaderCell align="left" isFirst>
                        {t("cart.product")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="center">
                        {t("cart.variants", "Variants")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="center">
                        {t("cart.sku", "SKU")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="right">
                        {t("checkout.price")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="center">
                        {t("cart.quantity")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="right">
                        {t("cart.subtotal")}
                    </GradientTableHeaderCell>
                    <GradientTableHeaderCell align="center" isLast className="w-12">
                        <span className="sr-only">{t("cart.removeItem")}</span>
                    </GradientTableHeaderCell>
                </GradientTableHeader>
                <GradientTableBody>
                    {items.map((item, index) => {
                        const extras = getRowExtras?.(item) ?? {};
                        return (
                            <CartItemTableRow
                                key={item.id}
                                item={item}
                                previewPrice={extras.previewPrice}
                                displayName={extras.displayName}
                                displayVariant={extras.displayVariant}
                                displaySku={extras.displaySku}
                                productHref={extras.productHref}
                                canEditQuantity={canEditQuantity}
                                isLast={index === items.length - 1}
                                onQuantityChange={onQuantityChange}
                                onRemove={onRemove}
                            />
                        );
                    })}
                </GradientTableBody>
            </GradientTable>

            {canEditQuantity ? (
                <div className="flex justify-start">
                    <Link
                        to={continueShoppingPath(paths.client.home)}
                        state={{ restoreShoppingScroll: true }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-custom-primary bg-custom-card px-4 py-2 text-sm font-medium text-custom-primary transition-colors hover:bg-custom-hover"
                    >
                        <HiPlus className="h-4 w-4" />
                        {t("cart.addProducts", "Add products")}
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
