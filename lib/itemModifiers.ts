import type { OperationalSettings } from "./orderFeatures";

export type ItemModifierOption = {
  id: string;
  label: string;
  active?: boolean;
};

export const defaultItemModifiers: ItemModifierOption[] = [
  { id: "sem-wasabi", label: "Sem wasabi", active: true },
  { id: "sem-gengibre", label: "Sem gengibre", active: true },
  { id: "extra-shoyu", label: "Extra shoyu", active: true },
  { id: "extra-picante", label: "Extra picante", active: true },
];

export const getItemModifierOptions = (
  settings?: OperationalSettings | null
): ItemModifierOption[] => {
  const source = settings?.item_modifiers?.length
    ? settings.item_modifiers
    : defaultItemModifiers;

  return source
    .filter((option) => option.active !== false && option.label.trim())
    .map((option) => ({
      id: option.id || option.label.trim().toLowerCase().replace(/\s+/g, "-"),
      label: option.label.trim(),
      active: option.active !== false,
    }));
};

export const formatItemModifiers = (modifiers?: string[] | null) =>
  (modifiers || []).filter(Boolean).join(", ");

export const formatOrderItemLabel = (item: {
  name: string;
  quantity?: number | null;
  modifiers?: string[] | null;
}) => {
  const quantity = item.quantity ?? 1;
  const modifierText = formatItemModifiers(item.modifiers);
  return `${quantity}x ${item.name}${modifierText ? ` (${modifierText})` : ""}`;
};
