import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

const statusMap: Record<string, string> = {
  approved: "pago",
  rejected: "falhou",
  cancelled: "falhou",
  pending: "pendente",
  in_process: "pendente",
};

export async function POST(request: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
  }

  const body = await request.json();
  const paymentId =
    body?.data?.id || body?.id || new URL(request.url).searchParams.get("data.id");

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const client = new MercadoPagoConfig({ accessToken: token });
  const payment = new Payment(client);
  const result = await payment.get({ id: String(paymentId) });
  const payment_status = statusMap[String(result.status)] || "pendente";

  const update: Record<string, string> = { payment_status };

  // Quando aprovado: libera o pedido para a cozinha e notifica via WhatsApp
  if (payment_status === "pago") {
    update.status = "preparando";
  }

  const { data: orders } = await supabase
    .from("orders")
    .update(update)
    .eq("mercado_pago_payment_id", String(paymentId))
    .select();

  if (payment_status === "pago" && orders?.[0]) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${origin}/api/whatsapp/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders[0]),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, payment_status });
}
