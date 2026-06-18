import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

type Promotion = {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
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

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("promotions")
    .select("id,code,description,discount_type,discount_value,active")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 });
  }

  const promotion = data as Promotion;
  const discount = calculateDiscount(promotion, Number(subtotal) || 0);

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
    discount,
  });
}
