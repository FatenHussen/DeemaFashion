import {
    Truck,
    X,
    Clock,
    Package,
    MapPin,
    RotateCcw,
    MessageSquareWarning,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { orderDeliveryChoiceLabel } from "../utils/formatScheduledDelivery";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/shared/lib/utils";
import type { OrderStatus } from "../types";
import { getOrderStatusLabel, isOutDeliveryStatus } from "@/shared/lib/orderStatus";

type OrderItem = {
    name: string;
    category: string;
    store: string;
    quantity: number;
    price: string;
    image?: string;
};

type OrderCardProps = {
    orderNumber: string;
    status: OrderStatus;
    dateTime: string;
    items: OrderItem[];
    additionalInfo?: string;
    deliveryAddress?: string;
    total: string;
    paymentMethod: string;
    deliveryChoiceLabel?: string | null;
    scheduledDeliveryAt?: string | null;
    onViewDetails?: () => void;
    onTrackOrder?: () => void;
    onReorder?: () => void;
    onAddComplaint?: () => void;
    onCancelOrder?: () => void;
    refundStatus?: string;
};

type StatusTone = {
    label: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
};

const getStatusTone = (status: OrderStatus, t: (key: string) => string): StatusTone => {
    if (isOutDeliveryStatus(status)) {
        return {
            label: getOrderStatusLabel(status, { t }),
            dot: "#2563eb",
            badgeBg: "color-mix(in srgb, #2563eb 12%, var(--color-bg-card))",
            badgeText: "#1d4ed8",
            accent: "#2563eb",
        };
    }
    switch (status) {
        case "delivered":
            return {
                label: getOrderStatusLabel(status, { t }),
                dot: "var(--color-success)",
                badgeBg: "color-mix(in srgb, var(--color-success) 12%, var(--color-bg-card))",
                badgeText: "var(--color-success)",
                accent: "var(--color-success)",
            };
        case "preparing":
            return {
                label: getOrderStatusLabel(status, { t }),
                dot: "var(--color-warning)",
                badgeBg: "color-mix(in srgb, var(--color-warning) 14%, var(--color-bg-card))",
                badgeText: "var(--color-warning)",
                accent: "var(--color-warning)",
            };
        case "cancelled":
        case "cancelled_by_admin":
            return {
                label: getOrderStatusLabel(status, { t }),
                dot: "var(--color-error)",
                badgeBg: "color-mix(in srgb, var(--color-error) 12%, var(--color-bg-card))",
                badgeText: "var(--color-error)",
                accent: "var(--color-error)",
            };
        case "pending":
        default:
            return {
                label: getOrderStatusLabel(status, { t }),
                dot: "var(--color-api-second)",
                badgeBg: "color-mix(in srgb, var(--color-api-second) 12%, var(--color-bg-card))",
                badgeText: "var(--color-api-second)",
                accent: "var(--color-api-second)",
            };
    }
};

const extractLast4 = (paymentMethod: string): string => {
    if (typeof paymentMethod !== "string") return "1234";
    if (paymentMethod.includes("ending")) {
        return paymentMethod.split("ending")[1]?.trim() || "1234";
    }
    const digits = paymentMethod.match(/\d{4}/g);
    return digits?.[digits.length - 1] || "1234";
};

export default function OrderCard({
    orderNumber,
    status,
    dateTime,
    items,
    additionalInfo,
    deliveryAddress,
    total,
    paymentMethod,
    deliveryChoiceLabel,
    scheduledDeliveryAt,
    onViewDetails,
    onTrackOrder,
    onReorder,
    onAddComplaint,
    onCancelOrder,
    refundStatus,
}: OrderCardProps) {
    const { t, i18n } = useTranslation();
    const { isRTL } = useLanguage();
    const scheduledLabel = orderDeliveryChoiceLabel(
        deliveryChoiceLabel,
        scheduledDeliveryAt,
        i18n.language,
    );
    const tone = getStatusTone(status, t);
    const last4 = extractLast4(paymentMethod);
    const canCancel = !!onCancelOrder && (status === "pending" || status === "preparing");
    const primaryItem = items[0];
    const DetailsChevron = isRTL ? ChevronLeft : ChevronRight;
    const hasPayment =
        Boolean(paymentMethod) && paymentMethod !== "-" && paymentMethod !== "—";

    return (
        <article
            className={cn(
                "account-shell group/card relative flex h-full flex-col overflow-hidden rounded-2xl",
                "border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]",
                "shadow-[0_2px_14px_-6px_var(--color-shadow)]",
                "transition-[border-color,box-shadow,transform] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-api-second)_35%,var(--color-border-primary))]",
                "hover:shadow-[0_10px_28px_-12px_var(--color-shadow)]",
            )}
            dir={isRTL ? "rtl" : "ltr"}
        >
            <span
                className="absolute inset-y-0 start-0 w-1"
                style={{ backgroundColor: tone.accent }}
                aria-hidden
            />

            <div className="flex flex-1 flex-col p-4 ps-5 sm:p-5 sm:ps-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                            style={{
                                background:
                                    "color-mix(in srgb, var(--color-api-second) 12%, var(--color-bg-tertiary))",
                                color: "var(--color-api-second)",
                            }}
                        >
                            <Package className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight text-custom-primary">
                                {t("orders.order")} #{orderNumber}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-custom-secondary">
                                <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                <span className="truncate">{dateTime}</span>
                            </p>
                        </div>
                    </div>

                    <span
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: tone.badgeBg, color: tone.badgeText }}
                    >
                        <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tone.dot }}
                            aria-hidden
                        />
                        {tone.label}
                    </span>
                </div>

                {(primaryItem || scheduledLabel) && (
                    <div className="mt-4 space-y-1.5 rounded-xl bg-[color-mix(in_srgb,var(--color-bg-tertiary)_55%,transparent)] px-3.5 py-3">
                        {primaryItem?.store ? (
                            <p className="text-xs font-medium text-custom-primary">
                                {primaryItem.store}
                            </p>
                        ) : null}
                        {primaryItem?.name ? (
                            <p className="text-xs text-custom-secondary">{primaryItem.name}</p>
                        ) : null}
                        {scheduledLabel ? (
                            <p className="text-xs text-custom-secondary">
                                <span className="font-medium text-custom-primary">
                                    {t("orders.scheduledDelivery", "Delivery appointment")}:
                                </span>{" "}
                                {scheduledLabel}
                            </p>
                        ) : null}
                    </div>
                )}

                {deliveryAddress ? (
                    <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-custom-secondary">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-custom-tertiary" aria-hidden />
                        <p className="min-w-0">
                            <span className="text-custom-tertiary">{t("orders.deliveredTo")}: </span>
                            {deliveryAddress}
                        </p>
                    </div>
                ) : null}

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--color-border-primary)] pt-4">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-custom-tertiary">
                            {t("checkout.total", "Total")}
                        </p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-custom-primary">
                            {total}
                        </p>
                    </div>
                    {hasPayment ? (
                        <p className="max-w-[45%] truncate text-end text-xs text-custom-secondary">
                            {paymentMethod.includes("ending")
                                ? `${t("orders.visaEnding")} ${last4}`
                                : paymentMethod}
                        </p>
                    ) : null}
                </div>

                {(onTrackOrder || onReorder || onAddComplaint) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {onTrackOrder ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTrackOrder();
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-custom-primary transition-colors hover:border-[var(--color-border-accent)] hover:bg-[var(--color-bg-tertiary)]"
                            >
                                <Truck className="h-3.5 w-3.5" aria-hidden />
                                {t("orders.trackOrder")}
                            </button>
                        ) : null}
                        {onReorder ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReorder();
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-custom-primary transition-colors hover:border-[var(--color-border-accent)] hover:bg-[var(--color-bg-tertiary)]"
                            >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                {t("orders.reorder")}
                            </button>
                        ) : null}
                        {onAddComplaint ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddComplaint();
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-custom-secondary transition-colors hover:text-custom-primary"
                            >
                                <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden />
                                {t("orders.addComplaint")}
                            </button>
                        ) : null}
                    </div>
                )}

                {(canCancel || onViewDetails) && (
                    <div className="mt-4 flex gap-2 border-t border-[var(--color-border-primary)] pt-4">
                        {canCancel ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCancelOrder?.();
                                }}
                                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-error)_6%,transparent)] px-3 py-2.5 text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] sm:max-w-[140px] sm:flex-none"
                            >
                                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                                {t("common.cancel")}
                            </button>
                        ) : null}
                        {onViewDetails ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails();
                                }}
                                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--color-api-second)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-api-second-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-main)]/30"
                            >
                                {t("orders.viewDetails")}
                                <DetailsChevron className="h-4 w-4 opacity-90" aria-hidden />
                            </button>
                        ) : null}
                    </div>
                )}

                {(additionalInfo || refundStatus) && (
                    <div className="mt-3 space-y-1 text-xs text-custom-secondary">
                        {additionalInfo ? <p>{additionalInfo}</p> : null}
                        {refundStatus ? (
                            <p className="font-medium text-[var(--color-success)]">{refundStatus}</p>
                        ) : null}
                    </div>
                )}
            </div>
        </article>
    );
}
