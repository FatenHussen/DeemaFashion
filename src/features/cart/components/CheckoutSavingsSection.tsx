import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import {
    useExchangeCoupon,
    usePointsExchangeOptions,
} from "@/features/account/hooks/usePoints";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { isApiToastHandled } from "@/shared/lib/apiMessage";
import type { BenefitItem } from "../api/activeBenefitsApi";

type CheckoutSavingsSectionProps = {
    pointsBalance?: number | null;
    coupons: BenefitItem[];
    freeDeliveries: BenefitItem[];
    selectedCouponKey: string | null;
    selectedDeliveryKey: string | null;
    onSelectCoupon: (key: string | null, value: number | boolean | null) => void;
    onSelectDelivery: (key: string | null, value: number | boolean | null) => void;
    coupon: string;
    onCouponChange: (code: string) => void;
    couponDisabled?: boolean;
};

export default function CheckoutSavingsSection({
    pointsBalance,
    coupons,
    freeDeliveries,
    selectedCouponKey,
    selectedDeliveryKey,
    onSelectCoupon,
    onSelectDelivery,
    coupon,
    onCouponChange,
    couponDisabled = false,
}: CheckoutSavingsSectionProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const queryClient = useQueryClient();
    const [localCoupon, setLocalCoupon] = useState(coupon);
    const [applyingPoints, setApplyingPoints] = useState(false);
    const exchangeCoupon = useExchangeCoupon();
    const { data: exchangeOptions } = usePointsExchangeOptions(
        typeof pointsBalance === "number" && pointsBalance > 0,
    );

    const pointCoupon = coupons.find((c) => c.key === "point_coupon_exchange_id");
    const showPoints =
        (typeof pointsBalance === "number" && pointsBalance > 0) ||
        coupons.length > 0 ||
        freeDeliveries.length > 0;
    const pointsApplied = selectedCouponKey === "point_coupon_exchange_id";

    useEffect(() => {
        setLocalCoupon(coupon);
    }, [coupon]);

    const handleApplyCoupon = () => {
        const code = localCoupon.trim().toUpperCase();
        if (code) onCouponChange(code);
    };

    const handleApplyPoints = async () => {
        if (pointsApplied) {
            onSelectCoupon(null, null);
            return;
        }

        setApplyingPoints(true);
        try {
            if (pointCoupon && typeof pointCoupon.value === "number") {
                onSelectCoupon("point_coupon_exchange_id", pointCoupon.value);
                return;
            }

            const minPoints =
                exchangeOptions?.options?.coupon?.min_points ?? 100;
            if (!minPoints || (pointsBalance != null && pointsBalance < minPoints)) {
                toast.error(
                    t(
                        "checkout.notEnoughPoints",
                        "Not enough points to apply a discount.",
                    ),
                );
                return;
            }

            await exchangeCoupon.mutateAsync(Number(minPoints));
            await queryClient.invalidateQueries({
                queryKey: queryKeys.activeBenefits.get(),
            });
            const refreshed = await queryClient.fetchQuery({
                queryKey: queryKeys.activeBenefits.get(),
                queryFn: async () => {
                    const { _ActiveBenefitsApi } = await import(
                        "../api/activeBenefitsApi"
                    );
                    return _ActiveBenefitsApi.get();
                },
            });
            const next = refreshed.coupons.find(
                (c) => c.key === "point_coupon_exchange_id",
            );
            if (next && typeof next.value === "number") {
                onSelectCoupon("point_coupon_exchange_id", next.value);
                /* Applied quietly — order preview updates the totals. */
            }
        } catch (err) {
            if (!isApiToastHandled(err)) {
                toast.error(
                    t(
                        "checkout.pointsApplyFailed",
                        "Could not apply points. Try again.",
                    ),
                );
            }
        } finally {
            setApplyingPoints(false);
        }
    };

    return (
        <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
            {showPoints ? (
                <section className="rounded-2xl border border-custom-primary bg-custom-card px-4 py-4 sm:px-5">
                    <h2 className="mb-3 text-lg font-bold text-[color:var(--color-text)]">
                        {t("checkout.currentBalance", "Your current balance")}
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text)]">
                            <FaStar className="h-4 w-4 text-[color:var(--color-api-second)]" />
                            <span className="tabular-nums">
                                {(pointsBalance ?? 0).toLocaleString()}{" "}
                                {t("checkout.points", "points")}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isLoading={applyingPoints}
                            onClick={handleApplyPoints}
                            disabled={
                                applyingPoints ||
                                (!pointsApplied &&
                                    !(typeof pointsBalance === "number" &&
                                        pointsBalance > 0) &&
                                    !pointCoupon)
                            }
                            className="rounded-xl px-4 text-sm font-semibold text-white !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)]"
                        >
                            {pointsApplied
                                ? t("checkout.removeBenefit", "Remove")
                                : t("cart.applyCoupon", "Apply")}
                        </Button>
                    </div>

                    {freeDeliveries.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {freeDeliveries.map((item) => {
                                const active =
                                    selectedDeliveryKey === item.key &&
                                    selectedDeliveryKey != null;
                                return (
                                    <button
                                        key={`${item.key}-${String(item.value)}`}
                                        type="button"
                                        onClick={() =>
                                            onSelectDelivery(
                                                active ? null : item.key,
                                                active ? null : item.value,
                                            )
                                        }
                                        className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                                        style={
                                            active
                                                ? {
                                                      borderColor:
                                                          "color-mix(in srgb, var(--color-api-second) 45%, transparent)",
                                                      backgroundColor:
                                                          "color-mix(in srgb, var(--color-api-second) 10%, var(--color-bg-card))",
                                                      color: "var(--color-api-second)",
                                                  }
                                                : undefined
                                        }
                                    >
                                        {item.title}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </section>
            ) : null}

            <section className="rounded-2xl border border-custom-primary bg-custom-card px-4 py-4 sm:px-5 space-y-3">
                <h2 className="text-lg font-bold text-[color:var(--color-text)]">
                    {t("checkout.saveOnYourOrder", "Save on your order")}
                </h2>
                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder={t("cart.enterCode", "Enter code")}
                        value={localCoupon}
                        onChange={(e) => setLocalCoupon(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleApplyCoupon();
                            }
                        }}
                        className="flex-1 !bg-custom-card !border-custom-primary rounded-xl"
                        disabled={couponDisabled}
                        aria-label={t("cart.couponCode")}
                    />
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleApplyCoupon}
                        disabled={couponDisabled || !localCoupon.trim()}
                        className="!bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)] disabled:!opacity-60 text-white font-semibold rounded-xl shrink-0 px-4"
                    >
                        {t("cart.applyCoupon", "Apply")}
                    </Button>
                </div>
                {couponDisabled ? (
                    <p className="text-xs text-custom-secondary">
                        {t(
                            "cart.couponDisabledByBenefit",
                            "Remove the selected discount to use a coupon code",
                        )}
                    </p>
                ) : null}
            </section>
        </div>
    );
}
