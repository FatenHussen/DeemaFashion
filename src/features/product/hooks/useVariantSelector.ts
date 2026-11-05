import { useState, useMemo, useCallback, useEffect } from "react";
import type {
    AttributeMapItem,
    AttributeMapOption,
    ShopVariant,
    ProductImage,
    SelectedAttributes,
} from "../types/productDetails";
import { isPurchasableVariant, isVariantInStock } from "../types/productDetails";
import { gallerySrcsForSelection } from "../lib/productMedia";
import {
    findShopVariant,
    findShopVariantByNames,
    isIndependentPickerAttribute,
    optionHexById,
    resolveAttributeOptions,
    selectedIdsFromVariant,
    variantHasOption,
} from "../lib/findShopVariant";

interface UseVariantSelectorParams {
    /** When this changes, selection is dropped so we never keep another product's variant id. */
    productId?: number;
    attributesMap: AttributeMapItem[];
    shopVariants: ShopVariant[];
    defaultImages: ProductImage[];
    thumbnail?: string | null;
    basePrice: number;
    basePriceAfterDiscount: number;
}

interface AvailableAttribute extends AttributeMapItem {
    options: AttributeMapOption[];
    availableIds: number[];
    disabledIds: number[];
    selectedId: number | null;
    selectedName: string;
    valueHex: Record<number, string>;
}

/** Partial picker state: attribute name → chosen option id. */
type PickedOptionIds = Record<string, number>;

function comboAttributes(variant: ShopVariant) {
    return variant.attributes ?? [];
}

function attributesFromVariant(variant: ShopVariant | null): SelectedAttributes {
    const attrs: SelectedAttributes = {};
    if (!variant) return attrs;
    for (const attr of comboAttributes(variant)) {
        attrs[attr.attribute] = attr.value;
    }
    return attrs;
}

function attributesFromPicks(
    picks: PickedOptionIds,
    attributesMap: AttributeMapItem[],
    shopVariants: ShopVariant[],
): SelectedAttributes {
    const attrs: SelectedAttributes = {};
    for (const attr of attributesMap) {
        const optionId = picks[attr.attribute];
        if (optionId == null) continue;
        const options = resolveAttributeOptions(attr, shopVariants);
        const option = options.find((o) => o.id === optionId);
        if (option?.name) attrs[attr.attribute] = option.name;
    }
    return attrs;
}

function idsFromPicks(picks: PickedOptionIds): number[] {
    return Object.values(picks).filter(
        (id) => Number.isFinite(id) && id > 0,
    );
}

/**
 * Keep the newly chosen axis; drop other axes that no longer appear together
 * on any shop row (e.g. colour change clears an unavailable size).
 */
function reconcilePicks(
    shopVariants: ShopVariant[],
    previous: PickedOptionIds,
    attrName: string,
    optionId: number,
): PickedOptionIds {
    const kept: PickedOptionIds = { [attrName]: optionId };

    for (const [name, id] of Object.entries(previous)) {
        if (name === attrName) continue;
        const candidate = { ...kept, [name]: id };
        if (findShopVariant(shopVariants, idsFromPicks(candidate))) {
            kept[name] = id;
        }
    }

    return kept;
}

function defaultPlainVariant(
    shopVariants: ShopVariant[],
): ShopVariant | undefined {
    if (shopVariants.length === 0) return undefined;
    return (
        shopVariants.find(isPurchasableVariant) ??
        shopVariants.find(isVariantInStock) ??
        shopVariants[0]
    );
}

function findVariantById(
    shopVariants: ShopVariant[],
    id: number | null,
): ShopVariant | undefined {
    if (id == null) return undefined;
    return shopVariants.find((variant) => variant.id === id);
}

function resolvePickedVariant(
    shopVariants: ShopVariant[],
    picks: PickedOptionIds,
    selectedNames: SelectedAttributes,
): ShopVariant | null {
    const ids = idsFromPicks(picks);
    if (!ids.length && !Object.keys(selectedNames).length) return null;
    return (
        (ids.length ? findShopVariant(shopVariants, ids) : null) ??
        findShopVariantByNames(shopVariants, selectedNames)
    );
}

interface UseVariantSelectorReturn {
    selectedAttributes: SelectedAttributes;
    selectedIds: number[];
    setAttributeOption: (attr: AttributeMapItem, optionId: number) => void;
    selectedVariant: ShopVariant | null;
    selectedShopVariantId: number | null;
    currentPrice: number;
    currentPriceAfterDiscount: number;
    currentImages: string[];
    currentQuantity: number | null;
    /** True when every `attributes_map` axis has a pick (or there is no matrix). */
    isSelectionComplete: boolean;
    isVariantSelected: boolean;
    availableAttributes: AvailableAttribute[];
}

/**
 * Picker state is `options[].id` / `attributes[].id`.
 * Labels (`name` / `value`) come from the last GET so a rename (صغير → XS)
 * only updates the shown text. Purchase identity is `shop_variants[].id`.
 *
 * When `attributes_map` is non-empty there is **no** default colour/size —
 * `selectedVariant` stays null until the shopper completes a real combo.
 * Plain products (`attributes_map` empty) still bind to `shop_variants[0]`.
 */
export function useVariantSelector({
    productId,
    attributesMap,
    shopVariants,
    defaultImages,
    thumbnail,
    basePrice,
    basePriceAfterDiscount,
}: UseVariantSelectorParams): UseVariantSelectorReturn {
    const [pickedByAttr, setPickedByAttr] = useState<PickedOptionIds>({});
    /** Used only when there is no attribute matrix. */
    const [plainVariantId, setPlainVariantId] = useState<number | null>(null);
    const [boundProductId, setBoundProductId] = useState(productId);

    if (productId !== boundProductId) {
        setBoundProductId(productId);
        setPickedByAttr({});
        setPlainVariantId(null);
    }

    const hasAttributeMatrix = attributesMap.length > 0;

    useEffect(() => {
        if (hasAttributeMatrix) {
            setPlainVariantId((id) => (id == null ? id : null));
            return;
        }
        if (shopVariants.length === 0) {
            setPlainVariantId((id) => (id == null ? id : null));
            return;
        }
        const stillThere =
            plainVariantId != null &&
            shopVariants.some((variant) => variant.id === plainVariantId);
        if (stillThere) return;

        const nextId = defaultPlainVariant(shopVariants)?.id ?? null;
        setPlainVariantId((id) => (id === nextId ? id : nextId));
    }, [hasAttributeMatrix, shopVariants, plainVariantId]);

    const isSelectionComplete = useMemo(() => {
        if (!hasAttributeMatrix) return true;
        return attributesMap.every((attr) => {
            const id = pickedByAttr[attr.attribute];
            return id != null && Number.isFinite(id);
        });
    }, [hasAttributeMatrix, attributesMap, pickedByAttr]);

    const selectedAttributes = useMemo((): SelectedAttributes => {
        if (!hasAttributeMatrix) {
            return attributesFromVariant(
                findVariantById(shopVariants, plainVariantId) ?? null,
            );
        }
        return attributesFromPicks(pickedByAttr, attributesMap, shopVariants);
    }, [
        hasAttributeMatrix,
        shopVariants,
        plainVariantId,
        pickedByAttr,
        attributesMap,
    ]);

    const selectedIds = useMemo(() => {
        if (!hasAttributeMatrix) {
            return selectedIdsFromVariant(
                findVariantById(shopVariants, plainVariantId) ?? null,
            );
        }
        return idsFromPicks(pickedByAttr);
    }, [hasAttributeMatrix, shopVariants, plainVariantId, pickedByAttr]);

    const selectedVariant = useMemo((): ShopVariant | null => {
        if (shopVariants.length === 0) return null;

        if (!hasAttributeMatrix) {
            return (
                findVariantById(shopVariants, plainVariantId) ??
                defaultPlainVariant(shopVariants) ??
                null
            );
        }

        // Incomplete colour/size picks → no variant (product gallery + blocked cart).
        if (!isSelectionComplete) return null;

        return resolvePickedVariant(
            shopVariants,
            pickedByAttr,
            selectedAttributes,
        );
    }, [
        shopVariants,
        hasAttributeMatrix,
        plainVariantId,
        isSelectionComplete,
        pickedByAttr,
        selectedAttributes,
    ]);

    const setAttributeOption = useCallback(
        (attr: AttributeMapItem, optionId: number) => {
            if (!hasAttributeMatrix) return;
            const options = resolveAttributeOptions(attr, shopVariants);
            const option = options.find((o) => o.id === optionId);
            if (!option) return;

            setPickedByAttr((prev) =>
                reconcilePicks(shopVariants, prev, attr.attribute, optionId),
            );
        },
        [hasAttributeMatrix, shopVariants],
    );

    const hexById = useMemo(
        () => optionHexById(attributesMap, shopVariants),
        [attributesMap, shopVariants],
    );

    const availableAttributes = useMemo((): AvailableAttribute[] => {
        return attributesMap.map((attr) => {
            const options = resolveAttributeOptions(attr, shopVariants);
            const axisIds = new Set(
                options.map((o) => o.id).filter((id) => id > 0),
            );
            const independent = isIndependentPickerAttribute(attr);
            const otherIds = selectedIds.filter((id) => !axisIds.has(id));

            const matchingVariants = independent
                ? shopVariants
                : shopVariants.filter((variant) => {
                      if (otherIds.length) {
                          return otherIds.every((id) =>
                              (variant.attributes ?? []).some((a) => a.id === id),
                          );
                      }
                      return Object.entries(selectedAttributes).every(
                          ([name, val]) => {
                              if (!val || name === attr.attribute) return true;
                              return (variant.attributes ?? []).some(
                                  (a) =>
                                      a.attribute === name && a.value === val,
                              );
                          },
                      );
                  });

            const availableIds: number[] = [];
            const disabledIds: number[] = [];
            for (const option of options) {
                const hasAnyVariant = matchingVariants.some((variant) =>
                    variantHasOption(variant, option, attr.attribute),
                );
                if (hasAnyVariant) availableIds.push(option.id);
                else disabledIds.push(option.id);
            }

            const selectedId =
                options.find((o) => o.id > 0 && selectedIds.includes(o.id))
                    ?.id ??
                options.find(
                    (o) => o.name === selectedAttributes[attr.attribute],
                )?.id ??
                null;

            return {
                ...attr,
                options,
                availableIds,
                disabledIds,
                selectedId,
                selectedName:
                    options.find((o) => o.id === selectedId)?.name ??
                    selectedAttributes[attr.attribute] ??
                    "",
                valueHex: hexById,
            };
        });
    }, [
        attributesMap,
        shopVariants,
        selectedAttributes,
        selectedIds,
        hexById,
    ]);

    const currentPrice = useMemo(() => {
        return selectedVariant?.price ?? basePrice;
    }, [selectedVariant, basePrice]);

    const currentPriceAfterDiscount = useMemo(() => {
        if (selectedVariant?.price_after_discount != null) {
            return selectedVariant.price_after_discount;
        }
        return basePriceAfterDiscount;
    }, [selectedVariant, basePriceAfterDiscount]);

    const currentImages = useMemo(
        () =>
            gallerySrcsForSelection(selectedVariant, {
                images: defaultImages,
                thumbnail,
            }),
        [selectedVariant, defaultImages, thumbnail],
    );

    const currentQuantity = useMemo(() => {
        return selectedVariant?.quantity ?? null;
    }, [selectedVariant]);

    const isVariantSelected = useMemo(() => {
        return !hasAttributeMatrix || selectedVariant !== null;
    }, [hasAttributeMatrix, selectedVariant]);

    return {
        selectedAttributes,
        selectedIds,
        setAttributeOption,
        selectedVariant,
        selectedShopVariantId: selectedVariant?.id ?? null,
        currentPrice,
        currentPriceAfterDiscount,
        currentImages,
        currentQuantity,
        isSelectionComplete,
        isVariantSelected,
        availableAttributes,
    };
}
