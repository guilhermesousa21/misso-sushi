import { NextResponse } from "next/server";
import { applyPaidOrderSideEffects } from "../../../../lib/orderSideEffects";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  const { orderId } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_status !== "pago") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await applyPaidOrderSideEffects(order);

  return NextResponse.json({ ok: true });
}
