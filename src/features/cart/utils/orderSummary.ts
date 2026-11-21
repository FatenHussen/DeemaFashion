import type {
  CartItem,
  CheckoutOrderSummary,
  OrderPreviewOrderDetails,
  OrderPreviewResponse,
  OrderSummary,
} from "../types";
import { toNum } from "../utils";
import { resolveCityTaxLine } from "./taxDisplay";
import { buildAutomaticRewardLines } from "./automaticPromotions";

function readDetailsMoney(
  value: unknown,
  formatPrice: (amount: number) => string,
): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && value !== null) {
    const formatted = (value as { formatted?: unknown }).formatted;
    if (typeof formatted === "string" && formatted.trim()) return formatted.trim();
    const amount = toNum((value as { amount?: unknown }).amount);
    if (amount > 0 || amount === 0) return formatPrice(amount);
  }
  if (typeof value === "string" && value.trim()) {
    if (/[0-9]/.test(value)) return value.trim();
    return formatPrice(toNum(value));
  }
  return formatPrice(toNum(value));
}

function readDetailsStoreNames(details?: OrderPreviewOrderDetails | null): string[] {
  if (!details?.stores?.length) return [];
  return details.stores
    .map((store) => store.name?.trim())
    .filter((name): name is string => Boolean(name));
}

export type PreviewSummaryLabels = {
  language: string;
  discountLabel: string;
  freeShippingLabel: string;
  freeShippingValue: string;
};

function formatDiscount(formatPrice: (amount: number) => string, amount: number): string {
  return amount > 0 ? `-${formatPrice(amount)}` : formatPrice(0);
}

function cityTaxSummary(
  preview: OrderPreviewResponse,
  formatPrice: (amount: number) => string,
  currencyCode?: string | null,
): { tax: string; taxRate?: string } | undefined {
  const line = resolveCityTaxLine(preview, formatPrice, currencyCode);
  if (!line) return undefined;
  return {
    tax: line.amount,
    ...(line.rateLabel ? { taxRate: line.rateLabel } : {}),
  };
}

export function getPreviewCouponDiscountAmount(preview: OrderPreviewResponse): number {
  const normalizedCouponDiscount = toNum(preview.coupon_discount);
  if (normalizedCouponDiscount > 0) return normalizedCouponDiscount;

  const legacyCouponDiscount = preview.coupon?.applied
    ? toNum(preview.coupon.discount)
    : 0;
  return legacyCouponDiscount;
}

export function getPreviewProductDiscountAmount(preview: OrderPreviewResponse): number {
  const subtotalBeforeDiscount = toNum(preview.subtotal_before_discount);
  const subtotalAfterProductDiscount = toNum(preview.subtotal_after_product_discount);
  return Math.max(0, subtotalBeforeDiscount - subtotalAfterProductDiscount);
}

export function mapPreviewToCartSummary(
  preview: OrderPreviewResponse,
  formatPrice: (amount: number) => string,
  labels?: PreviewSummaryLabels,
  currencyCode?: string | null,
): OrderSummary {
  const couponDiscount = getPreviewCouponDiscountAmount(preview);
  const subtotalBeforeDiscount = toNum(preview.subtotal_before_discount);
  const productDiscount = getPreviewProductDiscountAmount(preview);
  const basketDiscountAmount = toNum(preview.basket_discount_amount);
  const deliveryPrice = toNum(preview.delivery_price);
  const subscriptionDiscount = toNum(preview.subscription_discount);
  const promotionDiscount = toNum(preview.promotion_discount);
  const rewardLines = labels
    ? buildAutomaticRewardLines({
        automatic: preview.automatic_promotions,
        promotionDiscount,
        deliveryPrice,
        language: labels.language,
        formatAmount: formatPrice,
        discountLabel: labels.discountLabel,
        freeShippingLabel: labels.freeShippingLabel,
        freeShippingValue: labels.freeShippingValue,
      })
    : [];
  const automaticDiscountShown = rewardLines.some((line) =>
    line.id.startsWith("automatic-discount"),
  );
  const discountAmount =
    productDiscount +
    basketDiscountAmount +
    couponDiscount +
    subscriptionDiscount +
    promotionDiscount;
  const grossSubtotal =
    subtotalBeforeDiscount > 0
      ? subtotalBeforeDiscount
      : toNum(preview.subtotal);

  return {
    numOfItems: toNum(preview.total_quantity),
    subtotal: formatPrice(toNum(preview.subtotal)),
    invoiceSubtotal: formatPrice(grossSubtotal),
    discountTotal: formatDiscount(formatPrice, discountAmount),
    ...(productDiscount > 0 && {
      subtotalBeforeDiscount: formatPrice(subtotalBeforeDiscount),
      productDiscount: formatDiscount(formatPrice, productDiscount),
    }),
    shipping: deliveryPrice === 0 ? "Free" : formatPrice(deliveryPrice),
    shippingIsFree: deliveryPrice === 0,
    storeDiscounts: formatDiscount(formatPrice, basketDiscountAmount),
    basketDiscount:
      basketDiscountAmount > 0
        ? formatDiscount(formatPrice, basketDiscountAmount)
        : undefined,
    ...cityTaxSummary(preview, formatPrice, currencyCode),
    couponDiscount: formatDiscount(formatPrice, couponDiscount),
    ...(subscriptionDiscount > 0 && {
      subscriptionDiscount: formatDiscount(formatPrice, subscriptionDiscount),
    }),
    ...(promotionDiscount > 0 &&
      !automaticDiscountShown && {
        promotionDiscount: formatDiscount(formatPrice, promotionDiscount),
      }),
    ...(rewardLines.length > 0 && { rewardLines }),
    ...((preview.coupon?.excluded_items?.length ?? 0) > 0 && {
      excludedItemsCount: preview.coupon!.excluded_items.length,
    }),
    total: formatPrice(toNum(preview.total)),
    ...(preview.coupon && {
      couponFeedback: {
        valid: preview.coupon.valid,
        applied: preview.coupon.applied,
        fail_reasons: preview.coupon.fail_reasons ?? [],
      },
    }),
  };
}

export function mapPreviewToCheckoutSummary(
  preview: OrderPreviewResponse,
  items: CartItem[],
  formatPrice: (amount: number) => string,
  labels?: PreviewSummaryLabels,
  currencyCode?: string | null,
): CheckoutOrderSummary {
  const couponDiscount = getPreviewCouponDiscountAmount(preview);
  const subtotalBeforeDiscount = toNum(preview.subtotal_before_discount);
  const subtotalAfterProductDiscount = toNum(preview.subtotal_after_product_discount);
  const productDiscount = getPreviewProductDiscountAmount(preview);
  const deliveryPrice = toNum(preview.delivery_price);
  const basketDiscountAmount = toNum(preview.basket_discount_amount);
  const subscriptionDiscount = toNum(preview.subscription_discount);
  const promotionDiscount = toNum(preview.promotion_discount);
  const rewardLines = labels
    ? buildAutomaticRewardLines({
        automatic: preview.automatic_promotions,
        promotionDiscount,
        deliveryPrice,
        language: labels.language,
        formatAmount: formatPrice,
        discountLabel: labels.discountLabel,
        freeShippingLabel: labels.freeShippingLabel,
        freeShippingValue: labels.freeShippingValue,
      })
    : [];
  const automaticDiscountShown = rewardLines.some((line) =>
    line.id.startsWith("automatic-discount"),
  );

  const pointsFromPoints = toNum(preview.coupon_discount_from_points);
  const taxLine = cityTaxSummary(preview, formatPrice, currencyCode);
  const details = preview.order_details;
  const detailsStoreNames = readDetailsStoreNames(details);
  const storeNames =
    detailsStoreNames.length > 0
      ? detailsStoreNames
      : Array.from(
          new Set(
            items
              .map((item) => item.store?.trim())
              .filter((name): name is string => Boolean(name)),
          ),
        );

  const detailsSubtotal = readDetailsMoney(details?.subtotal, formatPrice);
  const detailsTax = readDetailsMoney(details?.tax, formatPrice);
  const detailsPoints = readDetailsMoney(details?.points_discount, formatPrice);
  const detailsCoupon = readDetailsMoney(details?.coupon_discount, formatPrice);
  const detailsDelivery = readDetailsMoney(details?.delivery_fees, formatPrice);
  const detailsGrandTotal = readDetailsMoney(details?.grand_total, formatPrice);

  return {
    items,
    itemsTotal: formatPrice(subtotalBeforeDiscount || subtotalAfterProductDiscount),
    subtotal: detailsSubtotal ?? formatPrice(toNum(preview.subtotal)),
    deliveryFees:
      detailsDelivery ??
      (deliveryPrice === 0 ? "Free" : formatPrice(deliveryPrice)),
    shippingIsFree:
      detailsDelivery != null
        ? isZeroFormattedMoney(detailsDelivery)
        : deliveryPrice === 0,
    storeDiscounts: formatDiscount(formatPrice, basketDiscountAmount),
    couponDiscount:
      detailsCoupon ?? formatDiscount(formatPrice, couponDiscount),
    ...(productDiscount > 0 && {
      productDiscount: formatDiscount(formatPrice, productDiscount),
    }),
    ...(subscriptionDiscount > 0 && {
      subscriptionDiscount: formatDiscount(formatPrice, subscriptionDiscount),
    }),
    ...(promotionDiscount > 0 &&
      !automaticDiscountShown && {
        promotionDiscount: formatDiscount(formatPrice, promotionDiscount),
      }),
    ...(rewardLines.length > 0 && { rewardLines }),
    ...(detailsTax
      ? { tax: detailsTax }
      : taxLine),
    ...(detailsPoints
      ? { pointsUsed: detailsPoints }
      : pointsFromPoints > 0
        ? { pointsUsed: formatDiscount(formatPrice, pointsFromPoints) }
        : {}),
    ...(storeNames.length > 0 && { storeNames }),
    total: detailsGrandTotal ?? formatPrice(toNum(preview.total)),
    numOfItems: toNum(preview.total_quantity),
    pointsEarned:
      typeof preview.automatic_promotions?.points_expected === "number"
        ? preview.automatic_promotions.points_expected
        : typeof preview.automatic_promotions?.points_awarded === "number"
          ? preview.automatic_promotions.points_awarded
          : undefined,
  };
}

function isZeroFormattedMoney(value: string): boolean {
  if (/free/i.test(value)) return true;
  const numeric = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return !Number.isFinite(numeric) || numeric === 0;
}
