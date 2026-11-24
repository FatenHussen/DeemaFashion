import { useEffect, useMemo, useState } from"react";
import { useNavigate } from"react-router-dom";
import { useTranslation } from"react-i18next";
import i18n from"@/i18n/config";
import { useLanguage } from"@/context/LanguageContext";
import { useCurrency } from"@/context/CurrencyContext";
import { formatOrderMoney } from"../utils/parseOrdersResponse";
import { ClipboardList, PackageSearch, Search } from "lucide-react";
import { cn } from"@/shared/lib/utils";
import { PremiumInlineLoader } from "@/shared/component/loading";
import { useMutation, useQueryClient } from"@tanstack/react-query";
import { toast } from"sonner";
import OrderCard from"@/features/cart/components/OrderCard";
import OrderDetailsModal from"../components/OrderDetailsModal";
import ComplaintFormModal from"../components/ComplaintFormModal";
import CancelOrderModal from"../components/CancelOrderModal";
import { useOrdersInfinite } from"../hooks/useOrders";
import { useInfiniteScroll } from"@/shared/hooks/useInfiniteScroll";
import { _OrderApi } from"@/features/cart/api/orderApi";
import { queryKeys } from"@/utils/queryKeys";
import { paths } from"@/app/routes/path/paths";
import type { OrderStatus } from"@/features/cart/types";
import type { Order } from"@/features/cart/types";
import type { OrderListItem } from"../types/order";
import {
 isApiOrderStatus,
 normalizeOrderStatus,
 type ApiOrderStatus,
} from"@/shared/lib/orderStatus";

function formatOrderDate(createdAt?: string): string {
 if (!createdAt) return "";
 try {
 const d = new Date(createdAt);
 if (Number.isNaN(d.getTime())) return createdAt;
 const locale = i18n.language ==="ar"?"ar":"en-GB";
 return d.toLocaleDateString(locale, {
 day:"2-digit",
 month:"short",
 year:"numeric",
 hour:"2-digit",
 minute:"2-digit",
 });
 } catch {
 return createdAt;
 }
}

function toOrderStatus(apiStatus: unknown): OrderStatus {
 const normalized = normalizeOrderStatus(apiStatus);
 if (isApiOrderStatus(normalized)) {
  return normalized as ApiOrderStatus;
 }
 // Keep the unknown key for display — do not coerce to pending.
 return (normalized || "pending") as OrderStatus;
}

function mapOrderToCard(
 item: OrderListItem,
 formatPrice: (n: number) => string,
 currencyCode: string,
): Order | null {
 try {
 if (item == null || typeof item !=="object" || item.id == null) return null;

 const status = toOrderStatus(item.status);
 const cartTypeLabel =
 item.cart_type ==="admin_cart"
 ? i18n.t("orders.cartType.basket")
 : item.cart_type ==="recipe"
 ? i18n.t("orders.cartType.recipe")
 : i18n.t("orders.cartType.products");

 const quantity = Number(item.total_quantity);
 const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
 const itemCountLabel =
 safeQuantity === 1
 ? i18n.t("orders.itemCountOne", { count: safeQuantity })
 : i18n.t("orders.itemCountOther", { count: safeQuantity });

 const total = formatOrderMoney(
 {
 amount: item.total_with_delivery ?? item.total,
 formatted:
 item.total_with_delivery_formatted ?? item.total_formatted,
 currencies:
 item.total_with_delivery_currencies ?? item.total_currencies,
 },
 currencyCode,
 formatPrice,
 );

 const linePrice = formatOrderMoney(
 {
 amount: item.total,
 formatted: item.total_formatted,
 currencies: item.total_currencies,
 },
 currencyCode,
 formatPrice,
 );

 const paymentName = item.payment_method?.name;
 const orderNumber = String(item.order_code ?? item.id);

 return {
 id: item.id,
 orderNumber,
 dateTime: formatOrderDate(item.created_at),
 status,
 items: [
 {
 name: String(itemCountLabel ?? ""),
 category:"",
 store: String(cartTypeLabel ?? ""),
 quantity: safeQuantity,
 price: linePrice,
 },
 ],
 additionalInfo: undefined,
 deliveryAddress: undefined,
 total,
 paymentMethod: paymentName ? String(paymentName) : "",
 deliveryChoiceLabel: item.delivery_choice_label ?? null,
 scheduledDeliveryAt: item.scheduled_delivery_at ?? null,
 actions: {
 viewDetails: true,
 trackOrder: status !=="delivered"&& status !=="cancelled",
 reorder: status ==="delivered"|| status ==="cancelled",
 addComplaint: status ==="delivered",
 },
 };
 } catch {
 return null;
 }
}

export default function MyOrders() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const { formatPrice, currency } = useCurrency();
 const navigate = useNavigate();
 const [searchQuery, setSearchQuery] = useState("");
 const [activeFilter, setActiveFilter] = useState<OrderStatus |"all">("all");
 const [sortBy, setSortBy] = useState("newest");
 const [selectedOrderId, setSelectedOrderId] = useState<
 number | string | null
 >(null);
 const [complaintModalOpen, setComplaintModalOpen] = useState(false);
 const [complaintOrderId, setComplaintOrderId] = useState<number | string | null>(null);
 const [cancelOrder, setCancelOrder] = useState<Order | null>(null);

 const {
 data: ordersData,
 isLoading,
 isFetchingNextPage,
 hasNextPage,
 fetchNextPage,
 error: ordersError,
 } = useOrdersInfinite(activeFilter);

 const observerTarget = useInfiniteScroll({
 onLoadMore: fetchNextPage,
 hasMore: hasNextPage,
 isLoading: isFetchingNextPage,
 threshold: 300,
 });

 // Fallback: trigger load more on window scroll near bottom (e.g. when scroll is in main document)
 useEffect(() => {
 if (!hasNextPage || isFetchingNextPage) return;
 const threshold = 400;
 const handleScroll = () => {
 const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
 const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
 if (distanceFromBottom < threshold) fetchNextPage();
 };
 window.addEventListener("scroll", handleScroll, { passive: true });
 return () => window.removeEventListener("scroll", handleScroll);
 }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

 const filteredOrders = useMemo(() => {
 // Status is now filtered server-side via useOrdersInfinite(activeFilter)
 const source = Array.isArray(ordersData) ? ordersData : [];
 let orders = source
 .map((item) => mapOrderToCard(item, formatPrice, currency))
 .filter((order): order is Order => order != null);

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 orders = orders.filter(
 (o) =>
 String(o.orderNumber).toLowerCase().includes(q) ||
 o.items.some(
 (i) =>
 String(i.name).toLowerCase().includes(q) ||
 String(i.store).toLowerCase().includes(q),
 ),
 );
 }

 if (sortBy ==="newest") {
 orders = [...orders].sort((a, b) => {
 return Number(b.id) > Number(a.id) ? 1 : -1;
 });
 } else if (sortBy ==="oldest") {
 orders = [...orders].sort((a, b) => {
 return Number(a.id) > Number(b.id) ? 1 : -1;
 });
 } else if (sortBy ==="amount_high") {
 orders = [...orders].sort((a, b) => {
 const numA = parseFloat(String(a.total).replace(/[^0-9.]/g,"")) || 0;
 const numB = parseFloat(String(b.total).replace(/[^0-9.]/g,"")) || 0;
 return numB - numA;
 });
 } else if (sortBy ==="amount_low") {
 orders = [...orders].sort((a, b) => {
 const numA = parseFloat(String(a.total).replace(/[^0-9.]/g,"")) || 0;
 const numB = parseFloat(String(b.total).replace(/[^0-9.]/g,"")) || 0;
 return numA - numB;
 });
 }

 return orders;
 }, [ordersData, activeFilter, searchQuery, sortBy, formatPrice, currency]);

 const handleViewDetails = (orderId: number | string) => {
 setSelectedOrderId(orderId);
 };

 const handleCardClick = (orderId: number | string, e: React.MouseEvent) => {
 if ((e.target as HTMLElement).closest("button")) return;
 setSelectedOrderId(orderId);
 };

 const handleTrackOrder = (orderId: number | string) => {
 navigate(paths.client.trackOrder.replace(":orderId", String(orderId)));
 };

 const queryClient = useQueryClient();

 const cancelMutation = useMutation({
 mutationFn: (orderId: number | string) => _OrderApi.cancelOrder(orderId),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
 toast.success(t("orders.cancelSuccess","Order cancelled successfully"));
 setCancelOrder(null);
 },
 onError: () => {
 toast.error(t("orders.cancelFailed","Failed to cancel order"));
 },
 });

 const reorderMutation = useMutation({
 mutationFn: (orderId: number | string) => _OrderApi.reorder(orderId),
 onSuccess: ({ id }) => {
 queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
 toast.success(t("orders.reorderSuccess","Order placed successfully"));
 navigate(paths.client.trackOrder.replace(":orderId", String(id)));
 },
 onError: () => {
 toast.error(t("orders.reorderFailed","Failed to reorder"));
 },
 });

 const handleReorder = (orderId: number | string) => {
 reorderMutation.mutate(orderId);
 };

 const handleAddComplaint = (orderId: number | string) => {
 setComplaintOrderId(orderId);
 setComplaintModalOpen(true);
 };

 const handleCancelOrder = (order: Order) => {
 setCancelOrder(order);
 };

 const handleCancelOrderConfirm = () => {
 if (!cancelOrder) return;
 cancelMutation.mutate(cancelOrder.id);
 };

 const filterButtons: { value: OrderStatus |"all"; label: string }[] = [
 { value:"all", label: t("orders.all") },
 { value:"pending", label: t("orders.pending") },
 { value:"preparing", label: t("orders.preparing") },
 { value:"out_delivery", label: t("orders.out_delivery") },
 { value:"delivered", label: t("orders.delivered") },
 { value:"cancelled", label: t("orders.cancelled") },
 ];

 const sortOptions = [
 { value:"newest", label: t("orders.newest") },
 { value:"oldest", label: t("orders.oldest") },
 { value:"amount_high", label: t("orders.amountHighToLow") },
 { value:"amount_low", label: t("orders.amountLowToHigh") },
 ];

 return (
 <div className="space-y-5 sm:space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <section
        className={cn(
          "account-shell relative overflow-hidden rounded-2xl border border-[var(--color-border-primary)]",
          "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-bg-card)_92%,var(--color-api-second))_0%,var(--color-bg-card)_58%,color-mix(in_srgb,var(--color-bg-card)_96%,var(--color-main))_100%)]",
          "p-5 shadow-[0_4px_24px_-8px_var(--color-shadow)] sm:p-6",
        )}
      >
        <span
          className="pointer-events-none absolute -end-10 -top-12 h-36 w-36 rounded-full bg-[var(--color-api-second)] opacity-[0.12] blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-api-second)] to-[var(--color-api-second-hover)] shadow-md">
              <ClipboardList className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-custom-primary sm:text-2xl">
                {t("orders.myOrders")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-custom-secondary">
                {t("orders.myOrdersDescription")}
              </p>
            </div>
          </div>
          {!isLoading && !ordersError ? (
            <span className="inline-flex w-fit shrink-0 items-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]/80 px-3 py-2 text-xs font-medium text-custom-secondary backdrop-blur-sm">
              {filteredOrders.length} {t("orders.myOrders")}
            </span>
          ) : null}
        </div>
      </section>

      <section className="account-shell space-y-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_2px_12px_-4px_var(--color-shadow)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-custom-tertiary",
                isRTL ? "right-3.5" : "left-3.5",
              )}
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className={cn(
                "w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] py-2.5 text-sm text-custom-primary",
                "placeholder:text-custom-tertiary focus:border-[var(--color-border-accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-api-second)_25%,transparent)]",
                isRTL ? "pl-4 pr-10" : "pl-10 pr-4",
              )}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] px-3.5 py-2.5 text-sm text-custom-primary focus:border-[var(--color-border-accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-api-second)_25%,transparent)] lg:min-w-[220px]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t("orders.sortBy")}: {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterButtons.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                activeFilter === filter.value
                  ? "bg-[var(--color-api-second)] text-white shadow-sm"
                  : "border border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] text-custom-secondary hover:border-[var(--color-border-accent)] hover:text-custom-primary",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

 {isLoading ? (
 <div className="flex justify-center py-16">
   <PremiumInlineLoader size="md" />
 </div>
 ) : ordersError ? (
 <div className="account-shell rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-6 py-16 text-center text-sm text-custom-secondary">
 {t("errors.pageLoadFailed","We could not display this page. Please try again.")}
 </div>
 ) : filteredOrders.length === 0 ? (
 <div className="account-shell flex flex-col items-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-6 py-16 text-center">
   <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-api-second)_12%,transparent)] text-[var(--color-api-second)]">
     <PackageSearch className="h-7 w-7" aria-hidden />
   </div>
   <p className="text-sm font-medium text-custom-primary">{t("orders.noOrdersFound")}</p>
   <p className="mt-1 max-w-sm text-xs text-custom-secondary">
     {t("orders.myOrdersDescription")}
   </p>
 </div>
 ) : (
 <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={(e) => handleCardClick(order.id, e)}
                onKeyDown={(e) =>
                  e.key ==="Enter"&&
                  handleCardClick(order.id, e as unknown as React.MouseEvent)
                }
                className="group cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-api-second)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
              >
 <OrderCard
 orderNumber={order.orderNumber}
 status={order.status}
 dateTime={order.dateTime}
 items={order.items}
 additionalInfo={order.additionalInfo}
 deliveryAddress={order.deliveryAddress}
 total={order.total}
 paymentMethod={order.paymentMethod}
 deliveryChoiceLabel={order.deliveryChoiceLabel}
 scheduledDeliveryAt={order.scheduledDeliveryAt}
 refundStatus={order.refundStatus}
 onViewDetails={() => handleViewDetails(order.id)}
 onTrackOrder={
 order.actions.trackOrder
 ? () => handleTrackOrder(order.id)
 : undefined
 }
 onReorder={
 order.actions.reorder
 ? () => handleReorder(order.id)
 : undefined
 }
 onAddComplaint={
 order.actions.addComplaint
 ? () => handleAddComplaint(order.id)
 : undefined
 }
 onCancelOrder={
 order.status ==="pending"|| order.status ==="preparing"
 ? () => handleCancelOrder(order)
 : undefined
 }
 />
 </div>
 ))}
 </div>

 <div ref={observerTarget} className="h-4"aria-hidden />
 {isFetchingNextPage && (
 <div className="flex justify-center py-4">
   <PremiumInlineLoader size="sm" />
 </div>
 )}
 </>
 )}

 <OrderDetailsModal
 orderId={selectedOrderId}
 isOpen={selectedOrderId != null}
 onClose={() => setSelectedOrderId(null)}
 onTrackOrder={(id) => {
 setSelectedOrderId(null);
 navigate(paths.client.trackOrder.replace(":orderId", String(id)));
 }}
 onAddComplaint={(id) => {
 setSelectedOrderId(null);
 setComplaintOrderId(id);
 setComplaintModalOpen(true);
 }}
 />

 <ComplaintFormModal
 isOpen={complaintModalOpen}
 onClose={() => {
 setComplaintModalOpen(false);
 setComplaintOrderId(null);
 }}
 onSuccess={() => {
 setComplaintModalOpen(false);
 setComplaintOrderId(null);
 }}
 prefillOrderId={complaintOrderId}
 />

 {cancelOrder && (
 <CancelOrderModal
 isOpen={!!cancelOrder}
 onClose={() => !cancelMutation.isPending && setCancelOrder(null)}
 onConfirm={handleCancelOrderConfirm}
 orderId={cancelOrder.orderNumber}
 status={cancelOrder.status}
 total={cancelOrder.total}
 paymentMethod={cancelOrder.paymentMethod}
 storeLabel={cancelOrder.items[0]?.store}
 isLoading={cancelMutation.isPending}
 />
 )}
 </div>
 );
}
