import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { paths } from "@/app/routes/path/paths";
import { continueShoppingPath } from "@/shared/lib/shoppingResume";
import { CartSummary, CartItemsList } from "../components";
import CheckoutProgressIndicator from "@/shared/component/CheckoutProgressIndicator";
import BasePopup from "@/shared/component/BasePopup";
import Button from "@/shared/ui/Button";
import { HiArrowLeft, HiPlus, HiTrash } from "react-icons/hi";
import { useCartStore } from "@/store/cart";
import { useAddresses } from "@/features/account/hooks/useAddress";
import { useOrderPreview } from "../hooks/useOrderPreview";
import { useCurrency } from "@/context/CurrencyContext";
import type { OrderSummary, OrderPreviewOrderItem } from "../types";
import { toNum } from "../utils";
import { assignPreviewOrderItemsToCart } from "../utils/enrichCartItems";
import { mapPreviewToCartSummary } from "../utils/orderSummary";
import { useCartCheckout } from "../hooks/useCartCheckout";
import { checkoutBlockMessage } from "../lib/cartCheckout";
import {
    clearServerCartSafe,
    syncQuantityToServer,
    syncRemoveToServer,
} from "../api/cartApi";

function parseSubtotal(s: string): number {
    return parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
}

export default function Cart() {
    const { t, i18n } = useTranslation();
    const { isRTL } = useLanguage();
    const { formatPrice, currency } = useCurrency();
    const navigate = useNavigate();
    const [showClearCartPopup, setShowClearCartPopup] = useState(false);
    const [itemPendingRemove, setItemPendingRemove] = useState<
        number | string | null
    >(null);

    const items = useCartStore((s) => s.items);
    const cart_type = useCartStore((s) => s.cart_type);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const removeItem = useCartStore((s) => s.removeItem);
    const clearCart = useCartStore((s) => s.clearCart);

    const { data: addresses = [], isLoading: isAddressesLoading } = useAddresses();
    const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
    const addressId = defaultAddress?.id ?? null;

    const { data: serverCheckout } = useCartCheckout();
    const { data: preview, isLoading: isPreviewLoading } = useOrderPreview(
        addressId != null ? addressId : null,
        undefined,
        {},
    );

    const showSummaryLoading =
        items.length > 0 &&
        (isAddressesLoading || (addressId != null && isPreviewLoading));

    const summary = useMemo<OrderSummary>(() => {
        if (preview) {
            return mapPreviewToCartSummary(
                preview,
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
        if (items.length > 0) {
            return {
                numOfItems: 0,
                subtotal: formatPrice(0),
                shipping: "-",
                shippingIsFree: false,
                storeDiscounts: formatPrice(0),
                couponDiscount: formatPrice(0),
                total: formatPrice(0),
            };
        }
        const numOfItems = items.reduce((sum, i) => sum + i.quantity, 0);
        const subtotalNum = items.reduce(
            (sum, i) => sum + parseSubtotal(i.subtotal),
            0,
        );
        const subtotal = formatPrice(subtotalNum);
        return {
            numOfItems,
            subtotal,
            shipping: "Free",
            shippingIsFree: true,
            storeDiscounts: formatPrice(0),
            couponDiscount: formatPrice(0),
            total: subtotal,
        };
    }, [currency, formatPrice, i18n.language, items, preview, t]);

    const previewOrderItemByCartId = useMemo(
        () =>
            assignPreviewOrderItemsToCart(
                items,
                preview?.orderItems as OrderPreviewOrderItem[] | undefined,
            ),
        [items, preview?.orderItems],
    );

    const summaryStatus: "loading" | "no-address" | "ready" =
        items.length === 0
            ? "ready"
            : isAddressesLoading
              ? "loading"
              : addresses.length === 0
                ? "no-address"
                : isPreviewLoading
                  ? "loading"
                  : "ready";

    const handleQuantityChange = (itemId: number | string, quantity: number) => {
        const item = useCartStore.getState().items.find((i) => i.id === itemId);
        updateQuantity(itemId, quantity);
        if (item) syncQuantityToServer(item, quantity);
    };

    const handleRemoveItem = (itemId: number | string) => {
        setItemPendingRemove(itemId);
    };

    const handleConfirmRemoveItem = () => {
        if (itemPendingRemove == null) return;
        const item = useCartStore
            .getState()
            .items.find((i) => i.id === itemPendingRemove);
        if (item) syncRemoveToServer(item);
        removeItem(itemPendingRemove);
        setItemPendingRemove(null);
    };

    const handleConfirmClearCart = () => {
        clearServerCartSafe(items);
        clearCart();
        setShowClearCartPopup(false);
    };

    const checkout = preview?.checkout ?? serverCheckout ?? null;
    const checkoutMessage = checkoutBlockMessage(checkout);
    const canCheckout = checkout ? checkout.can_checkout : true;

    const handleCheckout = () => {
        if (!canCheckout) return;
        navigate("/cart/checkout");
    };

    const isCartEmpty = items.length === 0;

    return (
        <div className="min-h-screen bg-custom-tertiary">
            <div className="page-container py-6" dir={isRTL ? "rtl" : "ltr"}>
                {!isCartEmpty && (
                    <div className="mb-6">
                        <CheckoutProgressIndicator currentStep="cart" />
                    </div>
                )}

                {isCartEmpty ? (
                    <div className="flex justify-center items-center min-h-[52vh]">
                        <div className="w-full max-w-md rounded-2xl border border-custom-primary bg-custom-card px-8 py-12 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-custom-muted text-custom-secondary">
                                <svg
                                    className="h-7 w-7"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-xl font-semibold text-custom-primary mb-2">
                                {t("cart.yourCartIsEmpty")}
                            </h1>
                            <p className="text-sm text-custom-secondary mb-7 max-w-xs mx-auto leading-relaxed">
                                {t("cart.emptyCartHint")}
                            </p>
                            <Link
                                to={continueShoppingPath(paths.client.home)}
                                state={{ restoreShoppingScroll: true }}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)]"
                            >
                                <HiArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                                {t("cart.continueShopping")}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-custom-primary">
                                    {t("cart.createOrder", "Create order")}
                                </h1>
                                <p className="mt-1 text-sm text-custom-secondary">
                                    {t("cart.itemsInCart", "{{count}} items", {
                                        count: items.reduce(
                                            (sum, item) => sum + item.quantity,
                                            0,
                                        ),
                                    })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {cart_type === "default" ? (
                                    <Link
                                        to={continueShoppingPath(paths.client.home)}
                                        state={{ restoreShoppingScroll: true }}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-api-second)_35%,transparent)] bg-custom-card px-3.5 py-2 text-sm font-semibold text-[color:var(--color-api-second)] hover:bg-[color:color-mix(in_srgb,var(--color-api-second)_8%,var(--color-bg-card))]"
                                    >
                                        <HiPlus className="h-4 w-4" />
                                        {t("cart.addProducts", "Add products")}
                                    </Link>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => setShowClearCartPopup(true)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-custom-primary text-custom-secondary hover:border-[color:var(--color-error)] hover:text-[color:var(--color-error)]"
                                    aria-label={t("cart.clearCart")}
                                    title={t("cart.clearCart")}
                                >
                                    <HiTrash className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <CartItemsList
                            items={items}
                            canEditQuantity={cart_type === "default"}
                            onQuantityChange={handleQuantityChange}
                            onRemove={handleRemoveItem}
                            getRowExtras={(item) => {
                                const orderItem = previewOrderItemByCartId.get(item.id);
                                const previewPrice = orderItem
                                    ? (() => {
                                          const priceBefore = toNum(orderItem.price);
                                          const priceAfter = toNum(
                                              orderItem.price_after_discount ??
                                                  orderItem.price,
                                          );
                                          return {
                                              price: priceAfter || priceBefore,
                                              priceBeforeDiscount:
                                                  priceBefore > 0
                                                      ? priceBefore
                                                      : undefined,
                                          };
                                      })()
                                    : undefined;
                                const productHref = (() => {
                                    if (item.productId == null) return undefined;
                                    const params = new URLSearchParams();
                                    if (item.shopId != null) {
                                        params.set("shop_id", String(item.shopId));
                                    }
                                    if (item.shop_product_variant_id != null) {
                                        params.set(
                                            "spv",
                                            String(item.shop_product_variant_id),
                                        );
                                    }
                                    const qs = params.toString();
                                    return `${paths.client.productDetails(item.productId)}${
                                        qs ? `?${qs}` : ""
                                    }`;
                                })();
                                return {
                                    previewPrice,
                                    displayName: orderItem?.product_name,
                                    displayVariant: orderItem?.variant,
                                    displaySku: orderItem?.sku ?? item.sku,
                                    displayStore: item.store,
                                    productHref,
                                };
                            }}
                        />

                        <CartSummary
                            summary={summary}
                            onCheckout={handleCheckout}
                            isLoading={showSummaryLoading}
                            status={summaryStatus}
                            onAddAddress={() => navigate(paths.account.addAddress)}
                            canCheckout={canCheckout}
                            checkoutMessage={checkoutMessage}
                        />
                    </div>
                )}
            </div>

            <BasePopup
                isOpen={itemPendingRemove != null}
                onClose={() => setItemPendingRemove(null)}
                icon={
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                            backgroundColor: "var(--color-error)",
                            boxShadow:
                                "0 12px 28px -10px color-mix(in srgb, var(--color-error) 40%, transparent)",
                        }}
                    >
                        <HiTrash className="w-10 h-10 text-white" />
                    </div>
                }
                title={t("cart.removeItemTitle", "Remove item?")}
                description={t(
                    "cart.removeItemConfirm",
                    "Are you sure you want to remove this item from your cart?",
                )}
                contentClassName="pt-12 p-8"
                actions={
                    <div className="flex flex-col gap-3">
                        <Button
                            type="button"
                            variant="danger"
                            size="lg"
                            fullWidth
                            onClick={handleConfirmRemoveItem}
                            className="text-white rounded-xl"
                        >
                            {t("cart.removeItem", "Remove item")}
                        </Button>
                        <button
                            type="button"
                            onClick={() => setItemPendingRemove(null)}
                            className="text-sm text-custom-secondary hover:text-custom-primary hover:underline transition-colors"
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                }
            />

            <BasePopup
                isOpen={showClearCartPopup}
                onClose={() => setShowClearCartPopup(false)}
                icon={
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                            backgroundColor: "var(--color-error)",
                            boxShadow:
                                "0 12px 28px -10px color-mix(in srgb, var(--color-error) 40%, transparent)",
                        }}
                    >
                        <HiTrash className="w-10 h-10 text-white" />
                    </div>
                }
                title={t("cart.clearCartTitle", "Clear cart?")}
                description={t(
                    "cart.clearCartConfirm",
                    "Are you sure you want to remove all items from your cart?",
                )}
                contentClassName="pt-12 p-8"
                actions={
                    <div className="flex flex-col gap-3">
                        <Button
                            type="button"
                            variant="danger"
                            size="lg"
                            fullWidth
                            onClick={handleConfirmClearCart}
                            className="text-white rounded-xl"
                        >
                            {t("cart.clearCart", "Delete all")}
                        </Button>
                        <button
                            type="button"
                            onClick={() => setShowClearCartPopup(false)}
                            className="text-sm text-custom-secondary hover:text-custom-primary hover:underline transition-colors"
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                }
            />
        </div>
    );
}
