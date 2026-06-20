import { NextResponse } from "next/server";
import type { PrintableOrder } from "../../../../lib/printOrder";
import { getOrderPickupLabel } from "../../../../lib/orderFeatures";

const normalizeWhatsAppPhone = (value?: string | null) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const buildReadyMessage = (order: PrintableOrder) =>
  [
    `Olá, ${order.name || "cliente"}!`,
    "",
    `Seu pedido #${order.id} está pronto para retirada no balcão.`,
    `Retirada: ${getOrderPickupLabel(order)}`,
    "Pode passar no Missô Sushi para retirar.",
    "",
    "Obrigado pelo pedido.",
  ].join("\n");

export async function POST(request: Request) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

  if (!token || !phoneNumberId) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.",
    });
  }

  const order = (await request.json()) as PrintableOrder;
  const customerPhone = normalizeWhatsAppPhone(order.phone);

  if (!customerPhone) {
    return NextResponse.json(
      { ok: false, configured: true, error: "Pedido sem telefone do cliente." },
      { status: 400 }
    );
  }

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
        to: customerPhone,
        type: "text",
        text: {
          preview_url: false,
          body: buildReadyMessage(order),
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
