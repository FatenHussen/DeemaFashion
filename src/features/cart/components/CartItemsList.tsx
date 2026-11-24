import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import CartItemCard from "./CartItemCard";
import type { CartItem } from "../types";

type RowExtras = {
    previewPrice?: { price: number; priceBeforeDiscount?: number };
    displayName?: string;
    displayVariant?: string[];
    displaySku?: string | null;
    displayStore?: string;
    productHref?: string;
    image?: string | null;
};

type CartItemsListProps = {
    items: CartItem[];
    canEditQuantity?: boolean;
    getRowExtras?: (item: CartItem) => RowExtras;
    onQuantityChange: (itemId: number | string, quantity: number) => void;
    onRemove: (itemId: number | string) => void;
};

export default function CartItemsList({
    items,
    canEditQuantity = true,
    getRowExtras,
    onQuantityChange,
    onRemove,
}: CartItemsListProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    return (
        <div
            className="overflow-hidden rounded-2xl border border-custom-primary bg-custom-card"
            dir={isRTL ? "rtl" : "ltr"}
        >
            {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-custom-secondary">
                    {t("cart.yourCartIsEmpty")}
                </p>
            ) : (
                <ul className="divide-y divide-custom-primary">
                    {items.map((item) => {
                        const extras = getRowExtras?.(item) ?? {};
                        return (
                            <li key={item.id}>
                                <CartItemCard
                                    item={item}
                                    previewPrice={extras.previewPrice}
                                    displayName={extras.displayName}
                                    displayVariant={extras.displayVariant}
                                    displayStore={extras.displayStore}
                                    productHref={extras.productHref}
                                    image={extras.image}
                                    canEditQuantity={canEditQuantity}
                                    onQuantityChange={onQuantityChange}
                                    onRemove={onRemove}
                                    displaySku={extras.displaySku}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
