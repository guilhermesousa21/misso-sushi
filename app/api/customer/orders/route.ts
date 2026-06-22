import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { phoneLookupKeys } from "../../../../lib/customerPhone";
import {
  customerSessionCookieName,
  verifyCustomerSessionToken,
} from "../../../../lib/customerSession";
import {
  isPaymentRecoverable,
  isWithinRecoveryWindow,
} from "../../../../lib/pendingPayment";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const orderFields =
  "id,name,phone,items,total,status,payment_status,payment_method,created_at,fulfillment_type,scheduled_for,note";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifyCustomerSessionToken(cookieStore.get(customerSessionCookieName)?.value);

    if (!session) {
      return NextResponse.json({ error: "Sessão expirada. Confirme seu telefone novamente." }, { status: 401 });
    }

    const lookupKeys = phoneLookupKeys(session.phone);
    const supabase = getSupabaseAdmin();

    const [{ data: paidOrders, error: paidError }, { data: pendingData, error: pendingError }] =
      await Promise.all([
        supabase
          .from("orders")
          .select(orderFields)
          .eq("payment_status", "pago")
          .in("phone", lookupKeys)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select(orderFields)
          .in("phone", lookupKeys)
          .in("payment_status", ["pendente", "expirado", "falhou"])
          .eq("status", "aguardando_pagamento")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (paidError) throw paidError;
    if (pendingError) throw pendingError;

    const pendingOrders = (pendingData || []).filter(
      (order) =>
        isPaymentRecoverable(order.payment_status) && isWithinRecoveryWindow(order.created_at)
    );

    return NextResponse.json({
      orders: paidOrders || [],
      pendingOrders,
      phone: session.phone,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar seus pedidos." }, { status: 500 });
  }
}
