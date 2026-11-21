import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/shared/lib/utils";
import type { PaymentMethodOption } from "../types";
import { getEnabledPaymentMethods } from "../utils/paymentMethods";

type CheckoutPaymentSectionProps = {
    paymentMethods: PaymentMethodOption[];
    selectedPaymentMethodId: string;
    onPaymentMethodSelect: (methodId: string) => void;
    allowEmpty?: boolean;
};

export default function CheckoutPaymentSection({
    paymentMethods,
    selectedPaymentMethodId,
    onPaymentMethodSelect,
    allowEmpty = false,
}: CheckoutPaymentSectionProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const enabledMethods = useMemo(
        () => getEnabledPaymentMethods(paymentMethods),
        [paymentMethods],
    );

    const defaultMethodId =
        selectedPaymentMethodId ||
        (allowEmpty ? "" : enabledMethods[0]?.id || "");

    return (
        <section
            className="rounded-2xl border border-custom-primary bg-custom-card px-4 py-5 sm:px-5"
            dir={isRTL ? "rtl" : "ltr"}
        >
            <h2 className="mb-4 text-lg font-bold text-[color:var(--color-text)]">
                {t("checkout.paymentMethod", "Payment method")}
            </h2>

            {enabledMethods.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-custom-primary px-5 py-8 text-center">
                    <p className="text-sm text-custom-secondary">
                        {t(
                            "checkout.noPaymentMethods",
                            "No payment methods are available right now.",
                        )}
                    </p>
                </div>
            ) : (
                <div
                    className={cn(
                        "grid gap-3",
                        enabledMethods.length > 1
                            ? "sm:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-1",
                    )}
                >
                    {enabledMethods.map((method) => {
                        const isSelected =
                            method.id ===
                            (selectedPaymentMethodId || defaultMethodId);

                        return (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => onPaymentMethodSelect(method.id)}
                                className={cn(
                                    "relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition-colors",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-main)_25%,transparent)]",
                                )}
                                style={
                                    isSelected
                                        ? {
                                              borderColor:
                                                  "color-mix(in srgb, var(--color-api-second) 55%, transparent)",
                                              backgroundColor:
                                                  "color-mix(in srgb, var(--color-api-second) 8%, var(--color-bg-card))",
                                          }
                                        : {
                                              borderColor:
                                                  "color-mix(in srgb, var(--color-text) 12%, transparent)",
                                              backgroundColor:
                                                  "var(--color-bg-card)",
                                          }
                                }
                            >
                                {isSelected ? (
                                    <span
                                        className="absolute top-2 end-2 h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor:
                                                "var(--color-success)",
                                        }}
                                    />
                                ) : null}

                                {method.icon ? (
                                    <img
                                        src={method.icon}
                                        alt=""
                                        className="h-8 max-w-[72px] object-contain"
                                    />
                                ) : (
                                    <div
                                        className="h-8 w-8 rounded-full"
                                        style={{
                                            backgroundColor:
                                                "color-mix(in srgb, var(--color-main) 12%, var(--color-bg-tertiary))",
                                        }}
                                    />
                                )}

                                <p className="text-sm font-semibold text-[color:var(--color-text)]">
                                    {method.name}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
