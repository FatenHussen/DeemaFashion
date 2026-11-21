import { useTranslation } from "react-i18next";
import ProgressIndicator from "./ProgressIndicator";
import type { ProgressStep } from "./ProgressIndicator";

type CheckoutProgressIndicatorProps = {
    /** `review` is treated as checkout (2-step flow; no separate review page). */
    currentStep?: "cart" | "checkout" | "review";
    className?: string;
};

export default function CheckoutProgressIndicator({
    currentStep = "cart",
    className = "",
}: CheckoutProgressIndicatorProps) {
    const { t } = useTranslation();

    const steps: ProgressStep[] = [
        {
            id: "cart",
            label: t("checkout.cart", "Shopping cart"),
        },
        {
            id: "checkout",
            label: t("checkout.paymentAndDelivery", "Payment and delivery"),
        },
    ];

    const stepIndexMap: Record<string, number> = {
        cart: 0,
        checkout: 1,
        review: 1,
    };

    return (
        <ProgressIndicator
            steps={steps}
            currentStep={stepIndexMap[currentStep] ?? 0}
            className={className}
        />
    );
}
