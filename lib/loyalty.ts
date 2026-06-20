import { getSupabaseAdmin } from "./supabaseAdmin";
import { formatCustomerPhone, normalizeCustomerPhone, onlyDigits, phoneLookupKeys } from "./customerPhone";

export const LOYALTY_ORDER_INTERVAL = 10;
export const LOYALTY_DISCOUNT_VALUE = 15;

export type LoyaltyStatus = {
  paidOrderCount: number;
  nextOrderNumber: number;
  ordersUntilReward: number;
  eligibleNow: boolean;
  discount: number;
  progressInCycle: number;
};

export const buildLoyaltyStatus = (paidOrderCount: number): LoyaltyStatus => {
  const nextOrderNumber = paidOrderCount + 1;
  const eligibleNow = nextOrderNumber > 0 && nextOrderNumber % LOYALTY_ORDER_INTERVAL === 0;
  const progressInCycle = paidOrderCount % LOYALTY_ORDER_INTERVAL;
  const ordersUntilReward = eligibleNow
    ? 0
    : LOYALTY_ORDER_INTERVAL - progressInCycle;

  return {
    paidOrderCount,
    nextOrderNumber,
    ordersUntilReward,
    eligibleNow,
    discount: eligibleNow ? LOYALTY_DISCOUNT_VALUE : 0,
    progressInCycle,
  };
};

export async function countPaidOrdersByPhone(phone: string) {
  const lookupKeys = phoneLookupKeys(phone);
  if (!lookupKeys.length) return 0;

  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pago")
      .in("phone", lookupKeys);

    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getLoyaltyStatusForPhone(phone: string) {
  const paidOrderCount = await countPaidOrdersByPhone(phone);
  return buildLoyaltyStatus(paidOrderCount);
}

export const loyaltyLookupPhone = (phone: string) => {
  const digits = onlyDigits(phone);
  return {
    digits,
    formatted: formatCustomerPhone(digits),
    normalized: normalizeCustomerPhone(digits),
  };
};
