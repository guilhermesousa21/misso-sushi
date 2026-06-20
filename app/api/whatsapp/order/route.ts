import { NextResponse } from "next/server";
import type { PrintableOrder } from "../../../../lib/printOrder";
import { formatAddonSummary, getOrderPickupLabel } from "../../../../lib/orderFeatures";

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const getTotal = (order: PrintableOrder) =>
  typeof order.total === "number"
    ? order.total
    : (order.items || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * (item.quantity ?? 1),
        0
      );

const buildOrderMessage = (order: PrintableOrder) => {
  const items = (order.items || [])
    .map((item) => {
      const quantity = item.quantity ?? 1;
      return `${quantity}x ${item.name} - ${money(Number(item.price || 0) * quantity)}`;
    })
    .join("\n");

  return [
    `Novo pedido #${order.id}`,
    "",
    `Cliente: ${order.name || "Cliente"}`,
    `Telefone: ${order.phone || "Não informado"}`,
    `Retirada: ${getOrderPickupLabel(order)}`,
    "",
    "Itens:",
    items || "Nenhum item salvo.",
    order.addons?.length ? `\nComplementos: ${formatAddonSummary(order.addons)}` : "",
    order.note ? `\nObs: ${order.note}` : "",
    "",
    `Pagamento: ${
      order.payment_method
        ? `${order.payment_method.toUpperCase()} - ${order.payment_status || "pendente"}`
        : order.payment_status || "pendente"
    }`,
    order.coupon_code
      ? `Cupom: ${order.coupon_code} (-${money(Number(order.discount_amount || 0))})`
      : "",
    Number(order.service_fee || 0) > 0
      ? `${order.service_fee_label || "Taxa de embalagem"}: ${money(Number(order.service_fee || 0))}`
      : "",
    `Total: ${money(getTotal(order))}`,
  ]
    .filter(Boolean)
    .join("\n");
};

export async function POST(request: Request) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const restaurantPhone = process.env.RESTAURANT_WHATSAPP_NUMBER;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

  if (!token || !phoneNumberId || !restaurantPhone) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error:
        "Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID e RESTAURANT_WHATSAPP_NUMBER.",
    });
  }

  const order = (await request.json()) as PrintableOrder;
  const message = buildOrderMessage(order);

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: restaurantPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, configured: true, error: data?.error?.message || "Erro ao enviar WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, configured: true, data });
}
