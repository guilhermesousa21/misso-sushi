import { formatBrasiliaDateTimeShort } from "./brasiliaTime";
import { formatOrderItemLabel } from "./itemModifiers";
import { getOrderPickupLabel, money } from "./orderFeatures";
import { normalizeWhatsAppPhone } from "./whatsappSend";

export type AdminOrderDetail = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  items?: {
    id?: number;
    name: string;
    price: number;
    quantity?: number | null;
    modifiers?: string[] | null;
  }[] | null;
  note?: string | null;
  total?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  loyalty_discount?: number | null;
  coupon_code?: string | null;
  service_fee?: number | null;
  service_fee_label?: string | null;
  addons?: {
    id?: string;
    name: string;
    quantity?: number | null;
    unit_price?: number | null;
  }[] | null;
  created_at?: string | null;
  payment_method?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

export const getOrderItemsSubtotal = (order: AdminOrderDetail) => {
  if (typeof order.subtotal === "number") return order.subtotal;

  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity ?? 1),
    0
  );
};

export const getOrderAddonTotal = (order: AdminOrderDetail) =>
  (order.addons || []).reduce(
    (sum, addon) => sum + Number(addon.unit_price || 0) * (addon.quantity ?? 1),
    0
  );

export const getActiveAddons = (order: AdminOrderDetail) =>
  (order.addons || []).filter((addon) => Number(addon.quantity || 0) > 0);

export const getOrderTotals = (order: AdminOrderDetail) => {
  const itemsSubtotal = getOrderItemsSubtotal(order);
  const addonTotal = getOrderAddonTotal(order);
  const serviceFee = Number(order.service_fee || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const loyaltyDiscount = Number(order.loyalty_discount || 0);
  const grandTotal =
    typeof order.total === "number"
      ? order.total
      : Math.max(0, itemsSubtotal + addonTotal + serviceFee - discountAmount - loyaltyDiscount);

  return {
    itemsSubtotal,
    addonTotal,
    serviceFee,
    serviceFeeLabel: order.service_fee_label || "Taxa de embalagem",
    discountAmount,
    loyaltyDiscount,
    grandTotal,
    hasBreakdown: addonTotal > 0 || serviceFee > 0 || discountAmount > 0 || loyaltyDiscount > 0,
  };
};

export const getCustomerWhatsAppUrl = (phone?: string | null) => {
  const normalized = normalizeWhatsAppPhone(phone);
  return normalized ? `https://wa.me/${normalized}` : "";
};

export const buildAdminOrderSummaryText = (order: AdminOrderDetail) => {
  const totals = getOrderTotals(order);
  const paymentLabel = paymentLabels[order.payment_method || ""] || order.payment_method || "—";
  const lines = [
    `Pedido #${order.id}`,
    `Cliente: ${order.name || "Cliente"}`,
    `Telefone: ${order.phone || "Não informado"}`,
    order.created_at ? `Data: ${formatBrasiliaDateTimeShort(order.created_at)}` : "",
    `Retirada: ${getOrderPickupLabel(order)}`,
    `Pagamento: ${paymentLabel}`,
    "",
    "Itens:",
  ].filter(Boolean);

  const items = order.items || [];
  if (items.length === 0) {
    lines.push("- Sem itens salvos neste pedido.");
  } else {
    items.forEach((item) => {
      const quantity = item.quantity ?? 1;
      const lineTotal = Number(item.price || 0) * quantity;
      lines.push(`- ${formatOrderItemLabel(item)} · ${money(lineTotal)}`);
    });
  }

  const addons = getActiveAddons(order);
  if (addons.length > 0) {
    lines.push("", "Complementos:");
    addons.forEach((addon) => {
      const quantity = addon.quantity ?? 1;
      const lineTotal = Number(addon.unit_price || 0) * quantity;
      lines.push(`- ${quantity}x ${addon.name} · ${money(lineTotal)}`);
    });
  }

  lines.push("");
  if (totals.hasBreakdown) {
    lines.push(`Subtotal: ${money(totals.itemsSubtotal)}`);
    if (totals.addonTotal > 0) lines.push(`Complementos: ${money(totals.addonTotal)}`);
    if (totals.serviceFee > 0) {
      lines.push(`${totals.serviceFeeLabel}: ${money(totals.serviceFee)}`);
    }
    if (totals.discountAmount > 0) {
      const couponSuffix = order.coupon_code ? ` (${order.coupon_code})` : "";
      lines.push(`Desconto cupom${couponSuffix}: -${money(totals.discountAmount)}`);
    }
    if (totals.loyaltyDiscount > 0) {
      lines.push(`Fidelidade: -${money(totals.loyaltyDiscount)}`);
    }
  }
  lines.push(`Total: ${money(totals.grandTotal)}`);

  if (order.note?.trim()) {
    lines.push("", `Observação: ${order.note.trim()}`);
  }

  return lines.join("\n");
};

export const copyTextToClipboard = async (text: string) => {
  if (!text.trim()) return false;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
};
