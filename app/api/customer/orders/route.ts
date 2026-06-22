import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { phoneLookupKeys } from "../../../../lib/customerPhone";
import {
  customerSessionCookieName,
  verifyCustomerSessionToken,
} from "../../../../lib/customerSession";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifyCustomerSessionToken(cookieStore.get(customerSessionCookieName)?.value);

    if (!session) {
      return NextResponse.json({ error: "Sessão expirada. Confirme seu telefone novamente." }, { status: 401 });
    }

    const lookupKeys = phoneLookupKeys(session.phone);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,name,phone,items,total,status,payment_status,created_at,fulfillment_type,scheduled_for,note"
      )
      .eq("payment_status", "pago")
      .in("phone", lookupKeys)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ orders: data || [], phone: session.phone });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar seus pedidos." }, { status: 500 });
  }
}
