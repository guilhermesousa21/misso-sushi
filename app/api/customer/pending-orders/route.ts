import { NextResponse } from "next/server";
import { isValidCustomerPhone, onlyDigits, phoneLookupKeys } from "../../../../lib/customerPhone";
import {
  isPaymentRecoverable,
  isWithinRecoveryWindow,
} from "../../../../lib/pendingPayment";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = onlyDigits(String(body?.phone || ""));

    if (!isValidCustomerPhone(phone)) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    const lookupKeys = phoneLookupKeys(phone);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,name,phone,total,status,payment_status,payment_method,created_at,fulfillment_type,scheduled_for"
      )
      .in("phone", lookupKeys)
      .in("payment_status", ["pendente", "expirado", "falhou"])
      .eq("status", "aguardando_pagamento")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    const pendingOrders = (data || []).filter(
      (order) =>
        isPaymentRecoverable(order.payment_status) && isWithinRecoveryWindow(order.created_at)
    );

    return NextResponse.json({ pendingOrders });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar pagamentos pendentes." },
      { status: 500 }
    );
  }
}
