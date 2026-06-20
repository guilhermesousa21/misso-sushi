import { getSupabaseAdmin } from "./supabaseAdmin";

type PaidOrderItem = {
  id?: number;
  quantity?: number;
};

type PaidOrder = {
  id: number | string;
  items?: PaidOrderItem[] | null;
  promotion_id?: number | null;
  inventory_consumed_at?: string | null;
  coupon_redeemed_at?: string | null;
};

const getItemQuantities = (items?: PaidOrderItem[] | null) => {
  const quantities = new Map<number, number>();

  (items || []).forEach((item) => {
    if (typeof item.id !== "number") return;
    quantities.set(item.id, (quantities.get(item.id) || 0) + (item.quantity ?? 1));
  });

  return quantities;
};

export async function applyPaidOrderSideEffects(order: PaidOrder) {
  const supabase = getSupabaseAdmin();

  if (!order.inventory_consumed_at) {
    const itemQuantities = getItemQuantities(order.items);
    await Promise.all(
      Array.from(itemQuantities.entries()).map(async ([itemId, quantity]) => {
        const { data: menuItem } = await supabase
          .from("menu")
          .select("stock_quantity")
          .eq("id", itemId)
          .maybeSingle();

        const currentStock = Number(menuItem?.stock_quantity);
        if (!Number.isFinite(currentStock)) return;

        const nextStock = Math.max(0, currentStock - quantity);
        await supabase
          .from("menu")
          .update({
            stock_quantity: nextStock,
            ...(nextStock <= 0
              ? { active: false, availability_status: "esgotado" }
              : {}),
          })
          .eq("id", itemId);
      })
    );

    await supabase
      .from("orders")
      .update({ inventory_consumed_at: new Date().toISOString() })
      .eq("id", order.id);
  }

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
