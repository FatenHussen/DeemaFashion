import { useState } from "react";
import { HiCheck, HiPlus } from "react-icons/hi";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/shared/lib/utils";
import Button from "@/shared/ui/Button";
import type { DeliveryAddress } from "../types";

type CheckoutAddressSectionProps = {
    addresses: DeliveryAddress[];
    selectedAddressId: number | string;
    onAddressSelect: (addressId: number | string) => void;
    onAddNewAddress?: () => void;
};

export default function CheckoutAddressSection({
    addresses,
    selectedAddressId,
    onAddressSelect,
    onAddNewAddress,
}: CheckoutAddressSectionProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [picking, setPicking] = useState(false);

    const selected =
        addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];
    const hasMultiple = addresses.length > 1;

    if (addresses.length === 0) {
        return (
            <section
                className="rounded-2xl border border-custom-primary bg-custom-card px-4 py-5 sm:px-5"
                dir={isRTL ? "rtl" : "ltr"}
            >
                <h2 className="mb-4 text-lg font-bold text-[color:var(--color-text)]">
                    {t("checkout.deliveryAddress")}
                </h2>
                <div className="rounded-2xl border border-dashed border-custom-primary px-5 py-8 text-center space-y-4">
                    <p className="text-sm text-custom-secondary">
                        {t(
                            "checkout.noAddressHint",
                            "Add an address so we know where to deliver this order.",
                        )}
                    </p>
                    {onAddNewAddress ? (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={onAddNewAddress}
                            className="inline-flex min-h-10 rounded-xl px-4 text-sm font-semibold text-white !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)] !border-transparent"
                        >
                            <HiPlus className="h-4 w-4" />
                            {t("checkout.addNewAddress")}
                        </Button>
                    ) : null}
                </div>
            </section>
        );
    }

    return (
        <section
            className="rounded-2xl border border-custom-primary bg-custom-card px-4 py-5 sm:px-5"
            dir={isRTL ? "rtl" : "ltr"}
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[color:var(--color-text)]">
                    {t("checkout.deliveryAddress")}
                </h2>
                {onAddNewAddress ? (
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={onAddNewAddress}
                        className="inline-flex min-h-10 rounded-xl px-4 text-sm font-semibold text-white !bg-[color:var(--color-api-second)] hover:!bg-[color:var(--color-api-second-hover)] !border-transparent"
                    >
                        <HiPlus className="h-4 w-4" />
                        {t("checkout.addNewAddress")}
                    </Button>
                ) : null}
            </div>

            {picking ? (
                <div className="space-y-3">
                    {addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                            <button
                                key={addr.id}
                                type="button"
                                onClick={() => {
                                    onAddressSelect(addr.id);
                                    setPicking(false);
                                }}
                                className="w-full text-start"
                            >
                                <AddressCard address={addr} selected={isSelected} />
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setPicking(false)}
                        className="text-sm font-semibold text-custom-secondary hover:underline"
                    >
                        {t("common.cancel", "Cancel")}
                    </button>
                </div>
            ) : (
                <div
                    className={cn(
                        "grid gap-3",
                        hasMultiple && "sm:grid-cols-[minmax(0,1fr)_minmax(140px,180px)]",
                    )}
                >
                    {selected ? <AddressCard address={selected} selected /> : null}
                    {hasMultiple ? (
                        <button
                            type="button"
                            onClick={() => setPicking(true)}
                            className="flex min-h-[88px] items-center justify-center rounded-2xl border-2 border-dashed border-custom-primary bg-[color:color-mix(in_srgb,var(--color-api-second)_4%,var(--color-bg-card))] px-3 text-center text-sm font-semibold text-[color:var(--color-api-second)] hover:border-[color:color-mix(in_srgb,var(--color-api-second)_45%,transparent)]"
                        >
                            {t(
                                "checkout.selectAnotherAddress",
                                "Choose another address",
                            )}
                        </button>
                    ) : null}
                </div>
            )}
        </section>
    );
}

function AddressCard({
    address,
    selected,
}: {
    address: DeliveryAddress;
    selected?: boolean;
}) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl border-2 px-4 py-4"
            style={
                selected
                    ? {
                          borderColor:
                              "color-mix(in srgb, var(--color-api-second) 45%, transparent)",
                          backgroundColor:
                              "color-mix(in srgb, var(--color-api-second) 7%, var(--color-bg-card))",
                      }
                    : {
                          borderColor:
                              "color-mix(in srgb, var(--color-text) 10%, transparent)",
                          backgroundColor: "var(--color-bg-card)",
                      }
            }
        >
            {selected ? (
                <div
                    className={cn(
                        "absolute top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white",
                        isRTL ? "left-3" : "right-3",
                    )}
                    style={{ backgroundColor: "var(--color-api-second)" }}
                >
                    <HiCheck className="h-4 w-4" />
                </div>
            ) : null}

            <div className="min-w-0 pe-9">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-[color:var(--color-text)]">
                        {address.fullName}
                    </span>
                    {address.isDefault ? (
                        <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: "var(--color-api-second)" }}
                        >
                            {t("checkout.defaultAddress", "Default")}
                        </span>
                    ) : null}
                </div>
                {address.phoneNumber ? (
                    <p className="mb-1 text-sm text-custom-secondary">
                        {address.phoneNumber}
                    </p>
                ) : null}
                <p className="text-sm leading-relaxed text-custom-secondary">
                    {address.address}
                </p>
            </div>
        </div>
    );
}
