import { formatBrasiliaDateTimeShort, toBrasiliaDateKey } from "./brasiliaTime";
import { formatOrderItemLabel } from "./itemModifiers";
import { getActiveAddons, getOrderTotals, type AdminOrderDetail } from "./adminOrderDetails";
import { getOrderPickupLabel } from "./orderFeatures";

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

const formatCsvDecimal = (value: number) => value.toFixed(2).replace(".", ",");

const escapeCsvCell = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value);
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatItemsSummary = (order: AdminOrderDetail) =>
  (order.items || [])
    .map((item) => formatOrderItemLabel(item))
    .join(" | ");

const formatAddonsSummary = (order: AdminOrderDetail) =>
  getActiveAddons(order)
    .map((addon) => `${addon.quantity ?? 1}x ${addon.name}`)
    .join(" | ");

export const buildOrdersCsv = (orders: AdminOrderDetail[]) => {
  const header = [
    "Pedido",
    "Data",
    "Cliente",
    "Telefone",
    "Itens",
    "Complementos",
    "Subtotal",
    "Taxa",
    "Desconto cupom",
    "Cupom",
    "Fidelidade",
    "Total",
    "Pagamento",
    "Retirada",
    "Observação",
  ];

  const rows = orders.map((order) => {
    const totals = getOrderTotals(order);
    const paymentLabel = paymentLabels[order.payment_method || ""] || order.payment_method || "";

    return [
      order.id,
      order.created_at ? formatBrasiliaDateTimeShort(order.created_at) : "",
      order.name || "Cliente",
      order.phone || "",
      formatItemsSummary(order),
      formatAddonsSummary(order),
      formatCsvDecimal(totals.itemsSubtotal),
      totals.serviceFee > 0 ? formatCsvDecimal(totals.serviceFee) : "",
      totals.discountAmount > 0 ? formatCsvDecimal(totals.discountAmount) : "",
      order.coupon_code || "",
      totals.loyaltyDiscount > 0 ? formatCsvDecimal(totals.loyaltyDiscount) : "",
      formatCsvDecimal(totals.grandTotal),
      paymentLabel,
      getOrderPickupLabel(order),
      order.note?.trim() || "",
    ].map(escapeCsvCell);
  });

  return [header.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
};

export const getOrdersCsvFilename = (options: {
  dateRange: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const today = toBrasiliaDateKey(new Date());

  if (options.dateRange === "custom") {
    const from = options.dateFrom || "inicio";
    const to = options.dateTo || "fim";
    return `pedidos-${from}-a-${to}.csv`;
  }

  return `pedidos-${options.dateRange}-${today}.csv`;
};

export const downloadOrdersCsv = (
  orders: AdminOrderDetail[],
  options: {
    dateRange: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const content = buildOrdersCsv(orders);
  const filename = getOrdersCsvFilename(options);
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
