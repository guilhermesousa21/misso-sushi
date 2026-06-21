import { formatBrasiliaDateTime } from "./brasiliaTime";
import {
  formatReceiptItemLine,
  formatReceiptPayment,
  formatReceiptPickup,
  getReceiptSubtotal,
  getReceiptTotal,
  receiptMoney,
} from "./orderReceipt";

type PrintableItem = {
  id?: number;
  name: string;
  price: number;
  quantity?: number;
  modifiers?: string[] | null;
};

type PrintableAddon = {
  id?: string;
  name: string;
  quantity?: number;
  unit_price?: number | null;
};

export type PrintableOrder = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  items?: PrintableItem[] | null;
  note?: string | null;
  total?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  loyalty_discount?: number | null;
  coupon_code?: string | null;
  service_fee?: number | null;
  service_fee_label?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
  addons?: PrintableAddon[] | null;
  status?: string | null;
  created_at?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDateTime = (value?: string | null) =>
  value ? formatBrasiliaDateTime(value) : formatBrasiliaDateTime(new Date());

export function printOrder(order: PrintableOrder) {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    window.print();
    return;
  }

  const items = order.items || [];
  const subtotal = getReceiptSubtotal(order);
  const discount = Number(order.discount_amount || 0);
  const loyaltyDiscount = Number(order.loyalty_discount || 0);
  const serviceFee = Number(order.service_fee || 0);
  const addonTotal = (order.addons || []).reduce(
    (sum, addon) => sum + Number(addon.unit_price || 0) * (addon.quantity ?? 1),
    0
  );
  const total = getReceiptTotal(order);
  const paymentLabel = formatReceiptPayment(order);

  const itemRows =
    items.length > 0
      ? items
          .map((item) => {
            const quantity = item.quantity ?? 1;
            const lineTotal = Number(item.price || 0) * quantity;

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(formatReceiptItemLine(item))}</strong>
                  <span>${receiptMoney(Number(item.price || 0))} cada</span>
                </td>
                <td>${receiptMoney(lineTotal)}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="2">Nenhum item salvo neste pedido.</td></tr>`;
  const addonText = (order.addons || [])
    .filter((addon) => Number(addon.quantity || 0) > 0)
    .map((addon) => {
      const quantity = addon.quantity ?? 1;
      const lineTotal = Number(addon.unit_price || 0) * quantity;
      return `${quantity}x ${addon.name}${lineTotal > 0 ? ` - ${receiptMoney(lineTotal)}` : ""}`;
    })
    .join(", ");

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Pedido #${escapeHtml(String(order.id))}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 18px;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
          }
          .receipt {
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
          }
          header {
            text-align: center;
            border-bottom: 1px solid #111;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          h1 {
            margin: 0;
            font-size: 21px;
            letter-spacing: 0;
          }
          h2 {
            margin: 6px 0 0;
            font-size: 18px;
          }
          .muted {
            color: #444;
            font-size: 12px;
          }
          .section {
            border-bottom: 1px dashed #777;
            padding: 10px 0;
          }
          .line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          td {
            border-bottom: 1px dashed #bbb;
            padding: 7px 0;
            vertical-align: top;
          }
          td:last-child {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
          }
          td span {
            display: block;
            margin-top: 2px;
            color: #555;
            font-size: 12px;
          }
          .total {
            font-size: 18px;
            font-weight: 800;
          }
          .note {
            white-space: pre-wrap;
            line-height: 1.45;
          }
          footer {
            margin-top: 12px;
            text-align: center;
            color: #444;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
            .receipt { max-width: none; }
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <header>
            <h1>Misso Sushi</h1>
            <h2>Pedido #${escapeHtml(String(order.id))}</h2>
            <div class="muted">${escapeHtml(formatDateTime(order.created_at))}</div>
          </header>

          <section class="section">
            <div class="line"><strong>Cliente</strong><span>${escapeHtml(order.name || "Cliente")}</span></div>
            <div class="line"><strong>Telefone</strong><span>${escapeHtml(order.phone || "Não informado")}</span></div>
            <div class="line"><strong>Retirada</strong><span>${escapeHtml(formatReceiptPickup(order))}</span></div>
            <div class="line"><strong>Status</strong><span>${escapeHtml(order.status || "recebido")}</span></div>
          </section>

          <section class="section">
            <strong>Itens</strong>
            <table>${itemRows}</table>
          </section>

          ${
            order.note
              ? `<section class="section"><strong>Observações</strong><p class="note">${escapeHtml(order.note)}</p></section>`
              : ""
          }
          ${
            addonText
              ? `<section class="section"><strong>Complementos</strong><p class="note">${escapeHtml(addonText)}</p></section>`
              : ""
          }

          <section class="section">
            <div class="line"><span>Pagamento</span><strong>${escapeHtml(paymentLabel)}</strong></div>
            <div class="line"><span>Subtotal</span><strong>${receiptMoney(subtotal)}</strong></div>
            ${
              addonTotal > 0
                ? `<div class="line"><span>Complementos</span><strong>${receiptMoney(addonTotal)}</strong></div>`
                : ""
            }
            ${
              serviceFee > 0
                ? `<div class="line"><span>${escapeHtml(order.service_fee_label || "Taxa de embalagem")}</span><strong>${receiptMoney(serviceFee)}</strong></div>`
                : ""
            }
            ${
              discount > 0
                ? `<div class="line"><span>Desconto${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ""}</span><strong>-${receiptMoney(discount)}</strong></div>`
                : ""
            }
            ${
              loyaltyDiscount > 0
                ? `<div class="line"><span>Fidelidade</span><strong>-${receiptMoney(loyaltyDiscount)}</strong></div>`
                : ""
            }
            <div class="line total"><span>Total</span><strong>${receiptMoney(total)}</strong></div>
          </section>

          <footer>Impresso pelo painel Misso Sushi</footer>
        </main>
        <script>
          window.addEventListener("load", function () {
            window.print();
            window.setTimeout(function () { window.close(); }, 300);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
