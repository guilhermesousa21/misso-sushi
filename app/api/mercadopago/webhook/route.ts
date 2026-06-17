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
    return NextResponse.json({ error: "Token nao configurado" }, { status: 500 });
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

  await supabase
    .from("orders")
    .update({ payment_status })
    .eq("mercado_pago_payment_id", String(paymentId));

  return NextResponse.json({ ok: true, payment_status });
}
