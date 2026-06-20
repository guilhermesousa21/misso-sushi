import { getSupabaseAdmin } from "./supabaseAdmin";

type PaidOrder = {
  id: number | string;
  promotion_id?: number | null;
  coupon_redeemed_at?: string | null;
};

export async function applyPaidOrderSideEffects(order: PaidOrder) {
  const supabase = getSupabaseAdmin();

  if (order.promotion_id && !order.coupon_redeemed_at) {
    const { data: promotion } = await supabase
      .from("promotions")
      .select("used_count")
      .eq("id", order.promotion_id)
      .maybeSingle();

    await supabase
      .from("promotions")
      .update({ used_count: Number(promotion?.used_count || 0) + 1 })
      .eq("id", order.promotion_id);

    await supabase
      .from("orders")
      .update({ coupon_redeemed_at: new Date().toISOString() })
      .eq("id", order.id);
  }
}
