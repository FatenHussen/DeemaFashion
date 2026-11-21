import type { ReactNode } from "react";
import { HiArrowRight } from "react-icons/hi";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import Button from "@/shared/ui/Button";
import FormattedPrice from "@/shared/component/FormattedPrice";
import { cn } from "@/shared/lib/utils";
import { formatCityTaxLabel } from "../utils/taxDisplay";
import type { OrderSummary } from "../types";

type CartSummaryStatus = "loading" | "no-address" | "ready";

type CartSummaryProps = {
    summary: OrderSummary;
    onCheckout: () => void;
    isLoading?: boolean;
    status?: CartSummaryStatus;
    onAddAddress?: () => void;
    canCheckout?: boolean;
    checkoutMessage?: string | null;
};

export default function CartSummary({
    summary,
    onCheckout,
    isLoading = false,
    status = "ready",
    onAddAddress,
    canCheckout = true,
    checkoutMessage = null,
}: CartSummaryProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    if (status === "loading" || isLoading) {
        return (
            <SummaryShell isRTL={isRTL}>
                <div className="space-y-5 animate-pulse p-5 sm:p-6">
                    <div className="h-8 bg-custom-muted rounded-xl" />
                    <div className="h-12 bg-custom-muted rounded-xl" />
                    <p className="text-xs text-custom-secondary text-center">
                        {t("cart.loadingPreview")}
                    </p>
                </div>
            </SummaryShell>
        );
    }

    if (status === "no-address") {
        return (
            <SummaryShell isRTL={isRTL}>
                <div className="p-5 sm:p-6 space-y-4">
                    <p className="text-sm text-custom-secondary leading-relaxed">
                        {t("cart.addAddressForPreview")}
                    </p>
                    <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={onAddAddress}
                        className="rounded-xl text-white font-semibold !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)]"
                    >
                        {t("cart.addAddress")}
                    </Button>
                </div>
            </SummaryShell>
        );
    }

    return (
        <SummaryShell isRTL={isRTL}>
            <div className="p-5 sm:p-6 space-y-4">
                {summary.tax ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-custom-secondary">
                            {formatCityTaxLabel(t("cart.tax", "Tax"), summary.taxRate)}
                        </span>
                        <FormattedPrice
                            value={summary.tax}
                            layout="inline"
                            className="font-semibold tabular-nums text-custom-primary"
                        />
                    </div>
                ) : null}

                <div
                    className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-3"
                    style={{
                        backgroundColor:
                            "color-mix(in srgb, var(--color-api-second) 10%, var(--color-bg-card))",
                    }}
                >
                    <span className="text-base font-bold text-[color:var(--color-text)]">
                        {t("cart.grandTotal", "Grand total")}
                    </span>
                    <FormattedPrice
                        value={summary.total}
                        layout="inline"
                        className="text-xl font-extrabold tabular-nums text-[color:var(--color-api-second)]"
                    />
                </div>

                {!canCheckout && checkoutMessage ? (
                    <Alert>{checkoutMessage}</Alert>
                ) : null}

                <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={onCheckout}
                    disabled={!canCheckout}
                    className="group !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)] disabled:!opacity-60 disabled:pointer-events-none text-white font-semibold rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
                >
                    <span>
                        {t(
                            "cart.proceedToPaymentAndDelivery",
                            "Proceed to payment & delivery",
                        )}
                    </span>
                    <HiArrowRight
                        className={cn(
                            "w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5",
                            isRTL && "rotate-180 group-hover:-translate-x-0.5",
                        )}
                    />
                </Button>
            </div>
        </SummaryShell>
    );
}

type SummaryShellProps = {
    children: ReactNode;
    isRTL: boolean;
};

function SummaryShell({ children, isRTL }: SummaryShellProps) {
    return (
        <div
            className="rounded-2xl border border-custom-primary bg-custom-card shadow-[0_8px_24px_-18px_color-mix(in_srgb,var(--color-text-primary)_28%,transparent)]"
            dir={isRTL ? "rtl" : "ltr"}
        >
            {children}
        </div>
    );
}

function Alert({ children }: { children: ReactNode }) {
    return (
        <div
            className="text-xs leading-relaxed flex items-start gap-2 rounded-xl px-3 py-2.5"
            style={{
                backgroundColor: "var(--color-ui-amber-50)",
                color: "var(--color-ui-amber-900)",
                border: "1px solid var(--color-ui-amber-200)",
            }}
        >
            <HiOutlineExclamationTriangle
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--color-ui-amber-400)" }}
            />
            <div className="flex-1 space-y-1">{children}</div>
        </div>
    );
}
