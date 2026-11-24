import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Coins, Gift, Percent } from "lucide-react";
import { paths } from "@/app/routes/path/paths";
import { cn } from "@/shared/lib/utils";

interface PointsRewardsCardProps {
  points: number;
  rewardsCount: number;
  subscriptionName: string | null;
}

export default function PointsRewardsCard({
  points,
  rewardsCount,
  subscriptionName,
}: PointsRewardsCardProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1.5 sm:gap-3",
        "rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border-primary))]",
        "bg-[var(--color-bg-card)] p-1.5 shadow-[0_8px_22px_-14px_rgba(90,58,46,0.22)]",
        "sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none",
        "dark:border-white/[0.1] dark:bg-[color-mix(in_srgb,var(--color-bg-card)_92%,#171412)]",
        "dark:sm:border-0 dark:sm:bg-transparent",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <InfoTile
        to={paths.account.pointsRewards}
        icon={<Coins className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />}
        title={t("home.yourPoints")}
        value={points.toLocaleString()}
      />
      <InfoTile
        to={paths.account.pointsRewards}
        icon={<Gift className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />}
        title={t("home.rewards")}
        value={`${rewardsCount} ${t("home.available")}`}
        divider
      />
      <InfoTile
        to={paths.account.packages}
        icon={<Percent className="h-3.5 w-3.5 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />}
        title={t("home.activeSubscription")}
        value={subscriptionName ?? t("home.noActiveSubscription")}
        divider
      />
    </div>
  );
}

interface InfoTileProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  divider?: boolean;
}

function InfoTile({ to, icon, title, value, divider }: InfoTileProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center",
        "sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:rounded-2xl sm:border sm:border-[color-mix(in_srgb,var(--color-primary)_14%,#E0D5C8)] sm:bg-[var(--color-bg-card)] sm:px-4 sm:py-3.5 sm:text-start",
        "sm:shadow-[0_8px_22px_-14px_rgba(90,58,46,0.2)]",
        "transition-[box-shadow,transform,border-color,background-color] duration-300",
        "hover:bg-[color-mix(in_srgb,#D4B39A_14%,transparent)] sm:hover:-translate-y-0.5 sm:hover:border-[color-mix(in_srgb,var(--color-primary)_32%,#E0D5C8)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_40%,transparent)]",
        "dark:sm:border-white/[0.1] dark:sm:bg-[color-mix(in_srgb,var(--color-bg-card)_92%,#171412)]",
        divider &&
          "before:absolute before:inset-y-2 before:start-0 before:w-px before:bg-[color-mix(in_srgb,var(--color-primary)_14%,#E0D5C8)] sm:before:hidden dark:before:bg-white/10",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 sm:rounded-xl",
          "bg-[color-mix(in_srgb,var(--color-brand-accent,#D4B39A)_42%,var(--color-brand-surface,#F7F5F2))] text-[var(--color-brand-primary,#5A3A2E)]",
          "ring-1 ring-[color-mix(in_srgb,var(--color-brand-highlight,#A9B07A)_28%,transparent)]",
          "dark:bg-[color-mix(in_srgb,var(--color-brand-highlight,#A9B07A)_18%,transparent)] dark:text-[var(--color-brand-accent,#D4B39A)]",
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 w-full sm:flex-1">
        <p className="truncate text-[10px] font-medium leading-tight text-[var(--color-text-secondary)] sm:text-xs dark:text-white/60">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs font-bold tracking-tight text-[var(--color-brand-primary,var(--color-text-primary))] sm:text-lg sm:leading-snug lg:text-xl dark:text-[var(--color-brand-accent,#D4B39A)]">
          {value}
        </p>
      </div>
    </Link>
  );
}
