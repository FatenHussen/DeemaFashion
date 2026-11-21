import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckoutProgressIndicator, SuccessPopup } from "@/shared/component";
import CheckoutAddressSection from "../components/CheckoutAddressSection";
import CheckoutPaymentSection from "../components/CheckoutPaymentSection";
import CheckoutOrderSummary from "../components/CheckoutOrderSummary";
import CheckoutSavingsSection from "../components/CheckoutSavingsSection";
import DeliveryChoiceSection from "../components/DeliveryChoiceSection";
import { useAddresses } from "@/features/account/hooks/useAddress";
import {
    useActivePoints,
    usePointsSummary,
} from "@/features/account/hooks/usePoints";
import { useOrderPreview } from "../hooks/useOrderPreview";
import { useActiveBenefits } from "../hooks/useActiveBenefits";
import { useCartStore } from "@/store/cart";
import { useCheckoutStore } from "@/store/checkout";
import { useAuthStore } from "@/store/auth";
import AddressForm from "@/features/account/view/AddressForm";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { _OrderApi } from "../api/orderApi";
import {
    clearServerCartSafe,
    suppressCartServerPull,
} from "../api/cartApi";
import { paths } from "@/app/routes/path/paths";
import type {
    CheckoutOrderSummary as CheckoutOrderSummaryType,
    DeliveryAddress,
} from "../types";
import { mapPreviewToCheckoutSummary } from "../utils/orderSummary";
import {
    enrichCartItemsWithPreview,
    getFreeOnlyDisplayItems,
} from "../utils/enrichCartItems";
import { useCurrency } from "@/context/CurrencyContext";
import type { Address } from "@/features/account/types";
import {
    isPaymentMethodEnabled,
    resolveSelectablePaymentMethodId,
} from "../utils/paymentMethods";
import { useCartCheckout } from "../hooks/useCartCheckout";
import {
    checkoutBlockMessage,
    formatDeliveryDurationLabel,
    isBeforeEarliest,
    isMinimumOrderBlock,
} from "../lib/cartCheckout";
import { resolveCustomerPromotionId } from "../utils/automaticPromotions";
import { isApiToastHandled } from "@/shared/lib/apiMessage";

const PAYMENT_STORAGE_KEY = "tikmool_payment_method_id";

function mapAddressToDeliveryAddress(addr: Address): DeliveryAddress {
    const parts = [
        addr.street_name,
        addr.building_number,
        addr.floor_apartment,
        addr.nearest_landmark,
    ].filter(Boolean);

    let areaName: string | undefined;
    if (addr.area?.name) {
        if (typeof addr.area.name === "string") {
            areaName = addr.area.name;
        } else {
            areaName = addr.area.name.en || addr.area.name.ar;
        }
    }

    return {
        id: addr.id,
        fullName: addr.label,
        phoneNumber: addr.contact_phone,
        address: [...parts, areaName].filter(Boolean).join(", "),
        isDefault: addr.is_default,
    };
}

export default function Checkout() {
    const { t, i18n } = useTranslation();
    const { isRTL } = useLanguage();
    const navigate = useNavigate();
    const { formatPrice, currency } = useCurrency();
    const authenticated = useAuthStore((s) => s.authenticated);
    const { data: addressesData = [] } = useAddresses();
    const cartItems = useCartStore((s) => s.items);
    const cart_type = useCartStore((s) => s.cart_type);
    const recipe_id = useCartStore((s) => s.recipe_id);
    const admin_basket_id = useCartStore((s) => s.admin_basket_id);
    const admin_schedule_basket_id = useCartStore(
        (s) => s.admin_schedule_basket_id,
    );
    const basket_schedule_id = useCartStore((s) => s.basket_schedule_id);
    const getPreviewItems = useCartStore((s) => s.getPreviewItems);
    const clearCart = useCartStore((s) => s.clearCart);
    const { data: activeBenefitsData } = useActiveBenefits();
    const { data: activePoints } = useActivePoints(authenticated);
    const { data: pointsSummary } = usePointsSummary(authenticated);

    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigatingToTrackOrder = useRef(false);
    const navigatingToHome = useRef(false);

    const checkoutAddresses = useMemo<DeliveryAddress[]>(
        () => addressesData.map(mapAddressToDeliveryAddress),
        [addressesData],
    );

    const defaultAddress =
        checkoutAddresses.find((a) => a.isDefault) ?? checkoutAddresses[0];
    const {
        addressId: storedAddressId,
        coupon: storedCoupon,
        paymentMethodId: storedPaymentId,
        pointCouponExchangeId,
        pointFreeDeliveryExchangeId,
        useSubscriptionDiscount,
        useSubscriptionFreeDelivery,
        promotionId,
        deliveryChoice,
        scheduledDeliveryAt,
        additionalNotes,
        setAddressId,
        setCoupon,
        setPaymentMethodId,
        setPointCouponExchangeId,
        setPointFreeDeliveryExchangeId,
        setUseSubscriptionDiscount,
        setUseSubscriptionFreeDelivery,
        setDeliveryChoice,
        setScheduledDeliveryAt,
        setEarliestDeliveryAt,
    } = useCheckoutStore();

    const [selectedCouponKey, setSelectedCouponKey] = useState<string | null>(
        () =>
            pointCouponExchangeId != null
                ? "point_coupon_exchange_id"
                : useSubscriptionDiscount
                  ? "use_subscription_discount"
                  : null,
    );
    const [selectedDeliveryKey, setSelectedDeliveryKey] = useState<
        string | null
    >(() =>
        pointFreeDeliveryExchangeId != null
            ? "point_free_delivery_exchange_id"
            : useSubscriptionFreeDelivery
              ? "use_subscription_free_delivery"
              : null,
    );

    const previewBenefits = useMemo(
        () => ({
            pointCouponExchangeId,
            pointFreeDeliveryExchangeId,
            useSubscriptionDiscount,
            useSubscriptionFreeDelivery,
            promotionId,
        }),
        [
            pointCouponExchangeId,
            pointFreeDeliveryExchangeId,
            useSubscriptionDiscount,
            useSubscriptionFreeDelivery,
            promotionId,
        ],
    );

    const { methods: paymentMethods } = usePaymentMethods();

    const selectedAddressId =
        storedAddressId ?? defaultAddress?.id ?? checkoutAddresses[0]?.id ?? "";
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
        () =>
            resolveSelectablePaymentMethodId(
                paymentMethods,
                storedPaymentId || localStorage.getItem(PAYMENT_STORAGE_KEY),
            ),
    );
    const [showAddAddressForm, setShowAddAddressForm] = useState(false);

    const { data: serverCheckout } = useCartCheckout();
    const { data: preview } = useOrderPreview(
        selectedAddressId ? Number(selectedAddressId) : null,
        storedCoupon || undefined,
        previewBenefits,
        selectedPaymentMethodId || undefined,
    );

    const enrichedItems = useMemo(
        () => enrichCartItemsWithPreview(cartItems, preview, formatPrice),
        [cartItems, preview, formatPrice],
    );
    const freeOnlyItems = useMemo(
        () =>
            getFreeOnlyDisplayItems(
                preview,
                cartItems,
                t("cart.free", "FREE"),
            ),
        [preview, cartItems, t],
    );
    const displayItems = useMemo(
        () => [...enrichedItems, ...freeOnlyItems],
        [enrichedItems, freeOnlyItems],
    );
    const checkoutSummary = useMemo<CheckoutOrderSummaryType>(() => {
        if (preview) {
            return mapPreviewToCheckoutSummary(
                preview,
                displayItems,
                formatPrice,
                {
                    language: i18n.language,
                    discountLabel: t("cart.promotionDiscount"),
                    freeShippingLabel: t("cart.automaticFreeShipping"),
                    freeShippingValue: t("cart.freeDelivery"),
                },
                currency,
            );
        }
        const storeNames = Array.from(
            new Set(
                displayItems
                    .map((item) => item.store?.trim())
                    .filter((name): name is string => Boolean(name)),
            ),
        );
        return {
            items: displayItems,
            itemsTotal: formatPrice(0),
            subtotal: formatPrice(0),
            deliveryFees: "-",
            storeDiscounts: formatPrice(0),
            couponDiscount: formatPrice(0),
            total: formatPrice(0),
            ...(storeNames.length > 0 && { storeNames }),
        };
    }, [currency, displayItems, formatPrice, i18n.language, preview, t]);

    const selectedPaymentMethod =
        paymentMethods.find(
            (method) =>
                method.id === selectedPaymentMethodId &&
                isPaymentMethodEnabled(method),
        ) ?? paymentMethods.find(isPaymentMethodEnabled);

    const isSuccessState = showSuccessPopup || createdOrderId != null;

    useEffect(() => {
        if (isSuccessState) return;
        if (cartItems.length === 0) {
            navigate(paths.client.cart, { replace: true });
        }
    }, [cartItems.length, isSuccessState, navigate]);

    useEffect(() => {
        if (defaultAddress && !storedAddressId && checkoutAddresses.length > 0) {
            setAddressId(defaultAddress.id);
        }
    }, [
        defaultAddress,
        storedAddressId,
        checkoutAddresses.length,
        setAddressId,
    ]);

    useEffect(() => {
        if (paymentMethods.length === 0) return;

        const nextId = resolveSelectablePaymentMethodId(
            paymentMethods,
            selectedPaymentMethodId ||
                storedPaymentId ||
                localStorage.getItem(PAYMENT_STORAGE_KEY),
        );

        if (!nextId || nextId === selectedPaymentMethodId) return;

        setSelectedPaymentMethodId(nextId);
        setPaymentMethodId(nextId);
        localStorage.setItem(PAYMENT_STORAGE_KEY, nextId);
    }, [
        paymentMethods,
        selectedPaymentMethodId,
        setPaymentMethodId,
        storedPaymentId,
    ]);

    const handleAddressSelect = (addressId: number | string) => {
        setAddressId(addressId);
    };

    const handlePaymentMethodSelect = (methodId: string) => {
        const method = paymentMethods.find((item) => item.id === methodId);
        if (!method || !isPaymentMethodEnabled(method)) return;

        setSelectedPaymentMethodId(methodId);
        setPaymentMethodId(methodId);
        localStorage.setItem(PAYMENT_STORAGE_KEY, methodId);
    };

    const handleSelectCouponBenefit = (
        key: string | null,
        value: number | boolean | null,
    ) => {
        setSelectedCouponKey(key);
        setPointCouponExchangeId(null);
        setUseSubscriptionDiscount(false);
        if (key === "point_coupon_exchange_id" && typeof value === "number") {
            setPointCouponExchangeId(value);
            setCoupon("");
        } else if (key === "use_subscription_discount") {
            setUseSubscriptionDiscount(true);
            setCoupon("");
        }
    };

    const handleSelectDeliveryBenefit = (
        key: string | null,
        value: number | boolean | null,
    ) => {
        setSelectedDeliveryKey(key);
        setPointFreeDeliveryExchangeId(null);
        setUseSubscriptionFreeDelivery(false);
        if (
            key === "point_free_delivery_exchange_id" &&
            typeof value === "number"
        ) {
            setPointFreeDeliveryExchangeId(value);
        } else if (key === "use_subscription_free_delivery") {
            setUseSubscriptionFreeDelivery(true);
        }
    };

    const checkout = preview?.checkout ?? serverCheckout ?? null;
    const instantOnly = checkout?.instant_only === true;
    const blockedByMinimum = isMinimumOrderBlock(checkout);
    const deliveryWindowLabel = formatDeliveryDurationLabel(
        checkout?.delivery_min_hours,
        checkout?.delivery_max_hours,
        t,
    );
    const scheduledTooEarly =
        !instantOnly &&
        deliveryChoice === "scheduled" &&
        (!scheduledDeliveryAt ||
            isBeforeEarliest(
                scheduledDeliveryAt,
                checkout?.earliest_delivery_at,
            ));
    const checkoutMessage = checkoutBlockMessage(checkout);
    const canConfirm =
        Boolean(selectedAddressId) &&
        Boolean(selectedPaymentMethod) &&
        Boolean(preview) &&
        !blockedByMinimum &&
        checkout?.can_checkout !== false &&
        !scheduledTooEarly &&
        !isSubmitting;

    useEffect(() => {
        setEarliestDeliveryAt(checkout?.earliest_delivery_at || null);
    }, [checkout?.earliest_delivery_at, setEarliestDeliveryAt]);

    const handleAddNewAddress = () => {
        setShowAddAddressForm(true);
    };

    const handleAddressFormSuccess = (addressId?: number) => {
        setShowAddAddressForm(false);
        if (addressId != null) {
            setAddressId(addressId);
        }
    };

    const handleConfirmOrder = async () => {
        if (
            !canConfirm ||
            !selectedAddressId ||
            !preview ||
            !selectedPaymentMethod
        ) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (
                !instantOnly &&
                deliveryChoice === "scheduled" &&
                (!scheduledDeliveryAt ||
                    isBeforeEarliest(
                        scheduledDeliveryAt,
                        checkout?.earliest_delivery_at,
                    ))
            ) {
                return;
            }

            const promotionToSend = resolveCustomerPromotionId(
                promotionId,
                preview.available_promotions,
            );
            const choice = instantOnly ? "asap" : deliveryChoice;
            const payload = {
                address_id: Number(selectedAddressId),
                cart_type,
                is_instant_delivery: choice === "asap",
                delivery_choice: choice,
                ...(choice === "scheduled" && scheduledDeliveryAt
                    ? { scheduled_delivery_at: scheduledDeliveryAt }
                    : {}),
                items: getPreviewItems(),
                ...(storedCoupon && { coupon: storedCoupon }),
                ...(recipe_id != null && { recipe_id }),
                ...(admin_basket_id != null && { admin_basket_id }),
                ...(admin_schedule_basket_id != null && {
                    admin_schedule_basket_id,
                }),
                ...(basket_schedule_id != null && { basket_schedule_id }),
                payment_method_id: selectedPaymentMethod.id,
                ...(additionalNotes && { notes: additionalNotes }),
                ...(pointCouponExchangeId != null && {
                    point_coupon_exchange_id: pointCouponExchangeId,
                }),
                ...(pointFreeDeliveryExchangeId != null && {
                    point_free_delivery_exchange_id:
                        pointFreeDeliveryExchangeId,
                }),
                ...(useSubscriptionDiscount && {
                    use_subscription_discount: true,
                }),
                ...(useSubscriptionFreeDelivery && {
                    use_subscription_free_delivery: true,
                }),
                ...(promotionToSend != null && {
                    promotion_id: promotionToSend,
                }),
            };

            const { id } = await _OrderApi.postOrder(payload);
            const cartSnapshot = useCartStore.getState().items;
            // Backend clears ordered cart_items; wipe local cache too and
            // suppress sync so a stale GET cannot refill before the wipe lands.
            suppressCartServerPull(120_000);
            clearCart();
            useCheckoutStore.getState().reset();
            await clearServerCartSafe(cartSnapshot);
            setCreatedOrderId(id);
            setShowSuccessPopup(true);
        } catch (err) {
            console.error("Order failed:", err);
            if (!isApiToastHandled(err)) {
                toast.error(
                    t(
                        "checkout.orderFailed",
                        "Could not place this order. Please try again.",
                    ),
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClosePopup = () => {
        setShowSuccessPopup(false);
        setCreatedOrderId(null);
    };

    const handleOrderDetails = () => {
        if (createdOrderId == null) return;
        navigatingToTrackOrder.current = true;
        setShowSuccessPopup(false);
        setCreatedOrderId(null);
        navigate(paths.client.orderDetails(createdOrderId));
    };

    const handleBackToHome = () => {
        navigatingToHome.current = true;
        setShowSuccessPopup(false);
        setCreatedOrderId(null);
        navigate(paths.client.home);
    };

    if (!isSuccessState && cartItems.length === 0) {
        return null;
    }

    return (
        <div className="bg-custom-tertiary min-h-screen">
            <div
                className="page-container py-6"
                dir={isRTL ? "rtl" : "ltr"}
            >
                <div className="mb-8">
                    <CheckoutProgressIndicator currentStep="checkout" />
                </div>

                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                    <h1 className="text-xl font-bold text-[color:var(--color-text)]">
                        {t(
                            "checkout.paymentAndDelivery",
                            "Payment & delivery",
                        )}
                    </h1>

                    {!showAddAddressForm ? (
                        <CheckoutAddressSection
                            addresses={checkoutAddresses}
                            selectedAddressId={selectedAddressId}
                            onAddressSelect={handleAddressSelect}
                            onAddNewAddress={handleAddNewAddress}
                        />
                    ) : (
                        <AddressForm
                            inline
                            onSuccess={handleAddressFormSuccess}
                            onCancel={() => setShowAddAddressForm(false)}
                        />
                    )}

                    {!blockedByMinimum && (
                        <DeliveryChoiceSection
                            choice={deliveryChoice}
                            scheduledDeliveryAt={scheduledDeliveryAt}
                            earliestDeliveryAt={
                                checkout?.earliest_delivery_at ?? ""
                            }
                            instantOnly={instantOnly}
                            deliveryWindowLabel={deliveryWindowLabel}
                            onChoiceChange={setDeliveryChoice}
                            onScheduledChange={setScheduledDeliveryAt}
                        />
                    )}

                    <CheckoutPaymentSection
                        paymentMethods={paymentMethods}
                        selectedPaymentMethodId={selectedPaymentMethodId}
                        onPaymentMethodSelect={handlePaymentMethodSelect}
                    />

                    <CheckoutSavingsSection
                        pointsBalance={
                            pointsSummary?.points ?? activePoints?.points
                        }
                        pointsValueLabel={
                            pointsSummary?.value?.estimated_value_formatted
                        }
                        coupons={activeBenefitsData?.coupons ?? []}
                        freeDeliveries={
                            activeBenefitsData?.free_deliveries ?? []
                        }
                        selectedCouponKey={selectedCouponKey}
                        selectedDeliveryKey={selectedDeliveryKey}
                        onSelectCoupon={handleSelectCouponBenefit}
                        onSelectDelivery={handleSelectDeliveryBenefit}
                        coupon={storedCoupon}
                        onCouponChange={setCoupon}
                        couponDisabled={!!selectedCouponKey}
                    />

                    {checkoutMessage && (
                        <p className="rounded-2xl border border-[color:var(--color-ui-amber-200)] bg-[color:var(--color-ui-amber-50)] px-4 py-3 text-sm leading-relaxed text-[color:var(--color-ui-amber-900)]">
                            {checkoutMessage}
                        </p>
                    )}
                    {scheduledTooEarly && !checkoutMessage && (
                        <p className="rounded-2xl border border-[color:var(--color-ui-amber-200)] bg-[color:var(--color-ui-amber-50)] px-4 py-3 text-sm leading-relaxed text-[color:var(--color-ui-amber-900)]">
                            {t("checkout.deliveryTooEarly", {
                                time: checkout?.earliest_delivery_at ?? "",
                                defaultValue:
                                    "Choose a time at or after {{time}}",
                            })}
                        </p>
                    )}

                    <CheckoutOrderSummary
                        summary={checkoutSummary}
                        onPlaceOrder={handleConfirmOrder}
                        buttonText={t(
                            "checkout.confirmOrder",
                            "Confirm order",
                        )}
                        canContinue={canConfirm}
                        isLoading={isSubmitting}
                        backHref={paths.client.cart}
                        backLabel={t("checkout.backToCart", "Back to cart")}
                        alwaysShowSpecLines
                    />
                </div>

                <SuccessPopup
                    isOpen={showSuccessPopup}
                    onClose={handleClosePopup}
                    pointsEarned={checkoutSummary.pointsEarned ?? 0}
                    primaryButtonText={t("orders.viewDetails")}
                    onPrimaryClick={handleOrderDetails}
                    secondaryButtonText={t(
                        "successPopup.backToHome",
                        "Back to home page",
                    )}
                    onSecondaryClick={handleBackToHome}
                />
            </div>
        </div>
    );
}
