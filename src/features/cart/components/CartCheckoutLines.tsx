import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HiOutlineClock, HiOutlineShoppingBag, HiOutlineTruck } from "react-icons/hi";
import {
    formatCheckoutDeliveryPrice,
    formatDeliveryDurationLabel,
} from "../lib/cartCheckout";
import type { CartCheckout } from "../types";

type CartCheckoutLinesProps = {
    checkout: CartCheckout;
};

export default function CartCheckoutLines({ checkout }: CartCheckoutLinesProps) {
    const { t } = useTranslation();
    const windowLabel = formatDeliveryDurationLabel(
        checkout.delivery_min_hours,
        checkout.delivery_max_hours,
        t,
    );
    const minOrder = checkout.min_order_amount.formatted.trim();
    const deliveryPrice = formatCheckoutDeliveryPrice(
        checkout.delivery_price,
        t("cart.deliveryFree", "Free"),
    );

    if (!windowLabel && !minOrder && !deliveryPrice) return null;

    return (
        <div className="grid gap-2.5 rounded-2xl border border-custom-primary bg-custom-card p-3.5 sm:grid-cols-3 sm:p-4">
            {windowLabel && (
                <InfoTile
                    icon={<HiOutlineClock className="h-4 w-4" />}
                    label={t("cart.deliveryDuration", "Delivery duration")}
                    value={windowLabel}
                />
            )}
            {minOrder && (
                <InfoTile
                    icon={<HiOutlineShoppingBag className="h-4 w-4" />}
                    label={t("cart.minOrderAmount", "Minimum order")}
                    value={minOrder}
                    numeric
                />
            )}
            {deliveryPrice && (
                <InfoTile
                    icon={<HiOutlineTruck className="h-4 w-4" />}
                    label={t("cart.deliveryPrice", "Delivery price")}
                    value={deliveryPrice}
                    numeric
                />
            )}
        </div>
    );
}

function InfoTile({
    icon,
    label,
    value,
    numeric = false,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    numeric?: boolean;
}) {
    return (
        <div className="rounded-xl bg-[color:color-mix(in_srgb,var(--color-main)_4%,var(--color-bg-card))] px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-custom-secondary">
                {icon}
                <span className="text-[11px] font-medium">{label}</span>
            </div>
            <p
                className={
                    numeric
                        ? "text-sm font-semibold tabular-nums text-[color:var(--color-text)]"
                        : "text-sm font-semibold text-[color:var(--color-text)]"
                }
            >
                {value}
            </p>
        </div>
    );
}
