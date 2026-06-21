import { formatBrasiliaDateTime } from "./brasiliaTime";
import type { PrintableOrder } from "./printOrder";

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const formatReceiptItemLine = (item: {
  name: string;
  price: number;
  quantity?: number | null;
  modifiers?: string[] | null;
}) => {
  const quantity = item.quantity ?? 1;
  const modifiers = (item.modifiers || []).filter(Boolean).join(", ");
  return `${quantity}x ${item.name}${modifiers ? ` (${modifiers})` : ""}`;
};

export const getReceiptTotal = (order: PrintableOrder) =>
  typeof order.total === "number"
    ? order.total
    : (order.items || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * (item.quantity ?? 1),
        0
      );

export const getReceiptSubtotal = (order: PrintableOrder) =>
  typeof order.subtotal === "number" ? order.subtotal : getReceiptTotal(order);

export const formatReceiptDateTime = (value?: string | null) =>
  value ? formatBrasiliaDateTime(value) : formatBrasiliaDateTime(new Date());

export const formatReceiptPickup = (order: PrintableOrder) =>
  order.fulfillment_type === "scheduled" && order.scheduled_for
    ? `Agendada para ${formatReceiptDateTime(order.scheduled_for)}`
    : "O quanto antes";

export const formatReceiptPayment = (order: PrintableOrder) => {
  const paymentStatus = order.payment_status || "pendente";
  return order.payment_method
    ? `${order.payment_method.toUpperCase()} - ${paymentStatus}`
    : paymentStatus;
};

export type ReceiptViewModel = {
  id: string;
  createdAtLabel: string;
  customerName: string;
  phone: string;
  pickupLabel: string;
  status: string;
  paymentLabel: string;
  items: {
    key: string;
    label: string;
    unitPriceLabel: string;
    lineTotalLabel: string;
  }[];
  note?: string;
  addonText?: string;
  subtotalLabel: string;
  addonTotal: number;
  addonTotalLabel?: string;
  serviceFee: number;
  serviceFeeLabel: string;
  discount: number;
  discountLabel: string;
  loyaltyDiscount: number;
  totalLabel: string;
};

export const getReceiptViewModel = (order: PrintableOrder): ReceiptViewModel => {
  const subtotal = getReceiptSubtotal(order);
  const discount = Number(order.discount_amount || 0);
  const loyaltyDiscount = Number(order.loyalty_discount || 0);
  const serviceFee = Number(order.service_fee || 0);
  const addonTotal = (order.addons || []).reduce(
    (sum, addon) => sum + Number(addon.unit_price || 0) * (addon.quantity ?? 1),
    0
  );
  const total = getReceiptTotal(order);
  const items = order.items || [];

  const addonText = (order.addons || [])
    .filter((addon) => Number(addon.quantity || 0) > 0)
    .map((addon) => {
      const quantity = addon.quantity ?? 1;
      const lineTotal = Number(addon.unit_price || 0) * quantity;
      return `${quantity}x ${addon.name}${lineTotal > 0 ? ` - ${money(lineTotal)}` : ""}`;
    })
    .join(", ");

  return {
    id: String(order.id),
    createdAtLabel: formatReceiptDateTime(order.created_at),
    customerName: order.name || "Cliente",
    phone: order.phone || "Não informado",
    pickupLabel: formatReceiptPickup(order),
    status: order.status || "recebido",
    paymentLabel: formatReceiptPayment(order),
    items:
      items.length > 0
        ? items.map((item, index) => {
            const quantity = item.quantity ?? 1;
            const unitPrice = Number(item.price || 0);
            return {
              key: `${order.id}-${item.id ?? index}`,
              label: formatReceiptItemLine(item),
              unitPriceLabel: `${money(unitPrice)} cada`,
              lineTotalLabel: money(unitPrice * quantity),
            };
          })
        : [
            {
              key: `${order.id}-empty`,
              label: "Nenhum item salvo neste pedido.",
              unitPriceLabel: "",
              lineTotalLabel: "",
            },
          ],
    note: order.note?.trim() || undefined,
    addonText: addonText || undefined,
    subtotalLabel: money(subtotal),
    addonTotal,
    addonTotalLabel: addonTotal > 0 ? money(addonTotal) : undefined,
    serviceFee,
    serviceFeeLabel: order.service_fee_label || "Taxa de embalagem",
    discount,
    discountLabel:
      discount > 0
        ? `Desconto${order.coupon_code ? ` (${order.coupon_code})` : ""}`
        : "",
    loyaltyDiscount,
    totalLabel: money(total),
  };
};

export const receiptMoney = money;
