import { getBusinessHours, isWithinBusinessHours, type BusinessHours } from "./storeHours";

export type OrderAddon = {
  id: string;
  name: string;
  quantity: number;
};

export type OrderFulfillmentType = "asap" | "scheduled";

export type OperationalSettings = {
  business_hours?: unknown;
  average_time?: string | null;
  service_fee?: number | null;
  service_fee_label?: string | null;
  pickup_slot_minutes?: number | null;
  min_pickup_minutes?: number | null;
  max_advance_days?: number | null;
  order_slot_limit?: number | null;
};

export const defaultServiceFeeLabel = "Taxa de embalagem";
export const defaultPickupSlotMinutes = 30;
export const defaultMinPickupMinutes = 35;
export const defaultMaxAdvanceDays = 1;

export const checkoutAddons: OrderAddon[] = [
  { id: "hashi", name: "Hashi", quantity: 1 },
  { id: "shoyu-extra", name: "Shoyu extra", quantity: 1 },
  { id: "gengibre", name: "Gengibre", quantity: 1 },
];

export const clampPositiveInteger = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return fallback;
  return Math.round(numberValue);
};

export const getServiceFee = (settings?: OperationalSettings | null) => {
  const fee = Number(settings?.service_fee || 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
};

export const getServiceFeeLabel = (settings?: OperationalSettings | null) =>
  settings?.service_fee_label?.trim() || defaultServiceFeeLabel;

export const getPickupSlotMinutes = (settings?: OperationalSettings | null) =>
  clampPositiveInteger(settings?.pickup_slot_minutes, defaultPickupSlotMinutes);

export const getMinPickupMinutes = (settings?: OperationalSettings | null) =>
  clampPositiveInteger(settings?.min_pickup_minutes, defaultMinPickupMinutes);

export const getMaxAdvanceDays = (settings?: OperationalSettings | null) =>
  clampPositiveInteger(settings?.max_advance_days, defaultMaxAdvanceDays);

export const getOrderSlotLimit = (settings?: OperationalSettings | null) => {
  const limit = Number(settings?.order_slot_limit || 0);
  return Number.isFinite(limit) && limit > 0 ? Math.round(limit) : 0;
};

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

export const roundUpToSlot = (date: Date, slotMinutes: number) => {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const roundedMinutes = Math.ceil(minutes / slotMinutes) * slotMinutes;
  next.setMinutes(roundedMinutes);
  return next;
};

export const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const formatPickupTime = (value?: string | null) => {
  if (!value) return "O quanto antes";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "O quanto antes";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatAddonSummary = (addons?: OrderAddon[] | null) =>
  (addons || [])
    .filter((addon) => Number(addon.quantity || 0) > 0)
    .map((addon) => `${addon.quantity}x ${addon.name}`)
    .join(", ");

export const getOrderPickupLabel = (order: {
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
}) =>
  order.fulfillment_type === "scheduled" && order.scheduled_for
    ? `Agendada para ${formatPickupTime(order.scheduled_for)}`
    : "O quanto antes";

export const buildPickupSlots = (
  settings: OperationalSettings | null | undefined,
  now = new Date()
) => {
  const businessHours: BusinessHours = getBusinessHours(settings?.business_hours);
  const slotMinutes = getPickupSlotMinutes(settings);
  const minPickupMinutes = getMinPickupMinutes(settings);
  const maxAdvanceDays = getMaxAdvanceDays(settings);
  const firstSlot = roundUpToSlot(addMinutes(now, minPickupMinutes), slotMinutes);
  const end = new Date(now);
  end.setDate(end.getDate() + maxAdvanceDays);
  end.setHours(23, 59, 59, 999);

  const slots: Date[] = [];
  for (
    let cursor = new Date(firstSlot);
    cursor <= end && slots.length < 96;
    cursor = addMinutes(cursor, slotMinutes)
  ) {
    if (isWithinBusinessHours(cursor, businessHours)) {
      slots.push(new Date(cursor));
    }
  }

  return slots;
};
