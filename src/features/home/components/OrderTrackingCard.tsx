import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { HiCheck, HiHome } from "react-icons/hi2";
import { BsHourglassSplit, BsReceipt } from "react-icons/bs";
import { MdDeliveryDining } from "react-icons/md";
import { MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { paths } from "@/app/routes/path/paths";
import type {
  ActiveOrder,
  ActiveOrderItem,
  ActiveOrderShopGroup,
  ActiveOrderStatus,
} from "@/features/cart/types";
import {
  ORDER_STEPPER_PRIORITY,
  ORDER_STEPPER_STAGES,
  getOrderStatusLabel,
  toOrderStepperStatus,
} from "@/shared/lib/orderStatus";
import { orderDeliveryChoiceLabel } from "@/features/cart/utils/formatScheduledDelivery";

const STAGES: ActiveOrderStatus[] = [...ORDER_STEPPER_STAGES];

function flattenOrderItems(order: ActiveOrder): ActiveOrderItem[] {
  const items = order.items;
  if (!items) return [];
  if (Array.isArray(items)) return items;
  return Object.values(items as Record<string, ActiveOrderShopGroup>).flatMap(
    (group) => group?.items ?? [],
  );
}

function getStatusFromItems(order: ActiveOrder): ActiveOrderStatus {
  const flatItems = flattenOrderItems(order);
  if (flatItems.length === 0) {
    return toOrderStepperStatus(order.status) ?? "pending";
  }
  let minPriority = ORDER_STEPPER_PRIORITY.delivered;
  for (const item of flatItems) {
    const step = toOrderStepperStatus(item.status);
    const p = step != null ? ORDER_STEPPER_PRIORITY[step] : 0;
    if (p < minPriority) minPriority = p;
  }
  const statusKey = Object.entries(ORDER_STEPPER_PRIORITY).find(
    ([, v]) => v === minPriority,
  )?.[0];
  return (statusKey ?? "pending") as ActiveOrderStatus;
}

function getStepState(
  stage: ActiveOrderStatus,
  currentStatus: ActiveOrderStatus,
): "completed" | "active" | "upcoming" {
  const currentIdx = STAGES.indexOf(currentStatus);
  const stageIdx = STAGES.indexOf(stage);
  if (stageIdx < currentIdx) return "completed";
  if (stageIdx === currentIdx) return "active";
  return "upcoming";
}

function getStageIcon(
  stage: ActiveOrderStatus,
  state: "completed" | "active" | "upcoming",
) {
  if (state === "completed") {
    return <HiCheck className="h-4 w-4 text-white" strokeWidth={3} />;
  }
  const color = state === "active" ? "text-white" : "text-[var(--color-text-tertiary)]";
  const size = "h-4 w-4";

  switch (stage) {
    case "pending":
      return <BsReceipt className={cn(size, color)} />;
    case "preparing":
      return <BsHourglassSplit className={cn(size, color)} />;
    case "out_delivery":
      return <MdDeliveryDining className={cn(size, color)} />;
    case "delivered":
      return <HiHome className={cn(size, color)} />;
    default:
      return null;
  }
}

interface OrderTrackingCardProps {
  order: ActiveOrder;
}

export default function OrderTrackingCard({ order }: OrderTrackingCardProps) {
  const { t, i18n } = useTranslation();
  const scheduledLabel = orderDeliveryChoiceLabel(
    order.delivery_choice_label,
    order.scheduled_delivery_at,
    i18n.language,
  );
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const currentStatus = useMemo(() => getStatusFromItems(order), [order]);
  const orderDisplay = order.order_code ?? order.id;
  const trackOrderUrl = paths.client.trackOrder.replace(":orderId", String(order.id));
  const isDelivered = currentStatus === "delivered";
  const showTrackOrderButton = !isDelivered;

  const statusRowLabel =
    order.status_label?.trim() ||
    (currentStatus === "pending"
      ? t("home.pending")
      : currentStatus === "preparing"
        ? t("home.preparing")
        : currentStatus === "out_delivery"
          ? t("home.outForDeliveryTitle")
          : currentStatus === "delivered"
            ? t("home.delivered")
            : getOrderStatusLabel(order.status, {
                t: (key, fallback) => t(key, fallback ?? ""),
              }));

  const brandFill = {
    background: "var(--color-brand-primary, var(--color-primary))",
  };
  const highlightFill = {
    background: "var(--color-brand-highlight, var(--color-api-second))",
  };

  const renderStage = (stage: ActiveOrderStatus, index: number) => {
    const state = getStepState(stage, currentStatus);
    const isActive = state === "active";
    const isCompleted = state === "completed";
    const isUpcoming = state === "upcoming";
    const isLast = index === STAGES.length - 1;

    return (
      <div
        key={stage}
        className="relative flex min-w-0 flex-1 flex-col items-center"
        data-step-state={state}
      >
        {!isLast && (
          <div
            className={cn(
              "absolute top-[18px] z-0 h-[2px] overflow-hidden rounded-full",
              isRTL ? "right-1/2 mr-5" : "left-1/2 ml-5",
            )}
            style={{ width: "calc(100% - 2.5rem)" }}
          >
            <div className="absolute inset-0 bg-[var(--color-border-primary)] dark:bg-white/[0.08]" />
            <div
              className={cn(
                "absolute inset-y-0 rounded-full transition-all duration-500",
                isRTL ? "right-0" : "left-0",
                isCompleted ? "w-full" : isActive ? "w-1/2" : "w-0",
              )}
              style={isCompleted || isActive ? brandFill : undefined}
            />
          </div>
        )}

        <div
          className={cn(
            "relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
            isUpcoming &&
              "border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] dark:border-white/[0.1] dark:bg-white/[0.04]",
            (isActive || isCompleted) && "shadow-sm ring-2 ring-white dark:ring-white/10",
          )}
          style={isUpcoming ? undefined : isActive ? highlightFill : brandFill}
        >
          {getStageIcon(stage, state)}
        </div>

        <p
          className={cn(
            "mt-2 text-center text-[11px] font-semibold leading-tight sm:text-xs",
            isUpcoming
              ? "text-[var(--color-text-tertiary)]"
              : "text-[var(--color-text-primary)] dark:text-white",
          )}
        >
          {stage === "pending" && t("home.pending")}
          {stage === "preparing" && t("home.preparing")}
          {stage === "out_delivery" && t("home.outForDeliveryTitle")}
          {stage === "delivered" && t("home.delivered")}
        </p>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-3 sm:p-4",
        "border border-[color-mix(in_srgb,var(--color-brand-accent,#D4B39A)_45%,var(--color-border-primary))]",
        "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-brand-background,#EAD8C7)_55%,#fff)_0%,#fff_70%)]",
        "shadow-[0_10px_28px_-18px_rgba(90,58,46,0.2)]",
        "dark:border-white/[0.1] dark:bg-[linear-gradient(165deg,#24201C_0%,#1C1916_55%,#171412_100%)]",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "rounded-xl border border-[color-mix(in_srgb,var(--color-brand-accent,#D4B39A)_30%,#fff)] bg-[var(--color-bg-card)] p-3.5 shadow-sm sm:p-4",
          "dark:border-white/[0.08] dark:bg-[color-mix(in_srgb,var(--color-bg-card)_88%,#171412)] dark:shadow-none",
        )}
      >
        {/* Header: receipt · order id · track */}
        <div className="mb-3 flex items-center gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={brandFill}
          >
            <BsReceipt className="h-4 w-4" />
          </div>

          <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-[var(--color-text-primary)] dark:text-white sm:text-base">
            {t("orders.order")} #{orderDisplay}
          </p>

          {showTrackOrderButton && (
            <Link
              to={trackOrderUrl}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-[filter,transform] duration-200",
                "hover:brightness-105 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]",
                "sm:gap-2 sm:px-3.5 sm:text-sm",
              )}
              style={brandFill}
              aria-label={t("home.trackOrder")}
            >
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              <span className="whitespace-nowrap">{t("home.trackOrder")}</span>
            </Link>
          )}
        </div>

        {/* Status */}
        <p className="mb-3.5 text-center text-xs font-medium text-[var(--color-text-secondary)] dark:text-white/65 sm:text-sm">
          <span className="font-bold text-[var(--color-brand-highlight,var(--color-api-second))]">{statusRowLabel}</span>
          {scheduledLabel ? (
            <>
              <span className="mx-1.5 opacity-40">-</span>
              <span>{scheduledLabel}</span>
            </>
          ) : null}
        </p>

        {/* Stepper */}
        <div className="flex items-start justify-between gap-1">
          {STAGES.map((stage, idx) => renderStage(stage, idx))}
        </div>
      </div>

      {isDarkTheme ? null : (
        <div
          aria-hidden
          className="pointer-events-none absolute -start-8 -top-10 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-2xl"
        />
      )}
    </div>
  );
}
