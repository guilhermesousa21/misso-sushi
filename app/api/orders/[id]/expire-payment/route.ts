import { NextResponse } from "next/server";
import { isPaymentPaid, isPaymentRecoverable } from "../../../../../lib/pendingPayment";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const orderId = Number(id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,payment_status,status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    if (isPaymentPaid(order.payment_status)) {
      return NextResponse.json({ ok: true, payment_status: "pago", alreadyPaid: true });
    }

    if (!isPaymentRecoverable(order.payment_status)) {
      return NextResponse.json({ error: "Este pedido não pode ser expirado." }, { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ payment_status: "expirado" })
      .eq("id", orderId)
      .select("id,payment_status,status")
      .maybeSingle();

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      order: updated,
      payment_status: updated?.payment_status || "expirado",
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível expirar o pagamento." }, { status: 500 });
  }
}
