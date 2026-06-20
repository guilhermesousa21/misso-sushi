import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

type Promotion = {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_value?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  active: boolean;
};

const calculateDiscount = (promotion: Promotion, subtotal: number) => {
  const value = Number(promotion.discount_value || 0);
  const discount =
    promotion.discount_type === "percent" ? subtotal * (value / 100) : value;
  return Math.min(subtotal, Math.max(0, discount));
};

export async function POST(request: Request) {
  const { code, subtotal } = await request.json();
  const orderSubtotal = Number(subtotal) || 0;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("promotions")
    .select("id,code,description,discount_type,discount_value,min_order_value,usage_limit,used_count,starts_at,expires_at,active")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 });
  }

  const promotion = data as Promotion;
  const now = new Date();
  const minOrder = Number(promotion.min_order_value || 0);
  if (minOrder > 0 && orderSubtotal < minOrder) {
    return NextResponse.json(
      { error: `Este cupom exige pedido mínimo de ${minOrder.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` },
      { status: 422 }
    );
  }

  if (promotion.starts_at && new Date(promotion.starts_at) > now) {
    return NextResponse.json({ error: "Este cupom ainda não começou." }, { status: 422 });
  }

  if (promotion.expires_at && new Date(promotion.expires_at) < now) {
    return NextResponse.json({ error: "Este cupom expirou." }, { status: 422 });
  }

  if (
    promotion.usage_limit &&
    Number(promotion.used_count || 0) >= Number(promotion.usage_limit)
  ) {
    return NextResponse.json({ error: "Este cupom atingiu o limite de usos." }, { status: 422 });
  }

  const discount = calculateDiscount(promotion, orderSubtotal);

  if (discount <= 0) {
    return NextResponse.json(
      { error: "Este cupom não gera desconto para este pedido." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    id: promotion.id,
    code: promotion.code,
    description: promotion.description,
    discount_type: promotion.discount_type,
    discount_value: promotion.discount_value,
    min_order_value: promotion.min_order_value,
    usage_limit: promotion.usage_limit,
    used_count: promotion.used_count,
    starts_at: promotion.starts_at,
    expires_at: promotion.expires_at,
    discount,
  });
}
