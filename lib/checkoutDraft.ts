export type StoredCheckoutCoupon = {
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
};

export type CheckoutDraft = {
  name: string;
  phone: string;
  note: string;
  wantsScheduledPickup: boolean;
  scheduledFor: string;
  selectedAddons: Record<string, number>;
  method: "pix" | "card";
  checkoutStep: 1 | 2 | 3;
  couponCode: string;
  appliedCoupon: StoredCheckoutCoupon | null;
};

const checkoutDraftStorageKey = "misso-sushi-checkout-draft";

const emptyDraft: CheckoutDraft = {
  name: "",
  phone: "",
  note: "",
  wantsScheduledPickup: false,
  scheduledFor: "",
  selectedAddons: {},
  method: "pix",
  checkoutStep: 1,
  couponCode: "",
  appliedCoupon: null,
};

const isCheckoutStep = (value: unknown): value is CheckoutDraft["checkoutStep"] =>
  value === 1 || value === 2 || value === 3;

const isPaymentMethod = (value: unknown): value is CheckoutDraft["method"] =>
  value === "pix" || value === "card";

const normalizeSelectedAddons = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, quantity]) => {
        const parsed = Number(quantity);
        return Number.isFinite(parsed) && parsed > 0;
      })
      .map(([id, quantity]) => [id, Number(quantity)])
  );
};

const normalizeStoredCoupon = (value: unknown): StoredCheckoutCoupon | null => {
  if (!value || typeof value !== "object") return null;

  const coupon = value as Partial<StoredCheckoutCoupon>;
  if (
    typeof coupon.id !== "number" ||
    typeof coupon.code !== "string" ||
    (coupon.discount_type !== "percent" && coupon.discount_type !== "fixed") ||
    typeof coupon.discount_value !== "number"
  ) {
    return null;
  }

  return {
    id: coupon.id,
    code: coupon.code,
    description: typeof coupon.description === "string" ? coupon.description : null,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    min_order_value:
      coupon.min_order_value === null || typeof coupon.min_order_value === "number"
        ? coupon.min_order_value
        : null,
    usage_limit:
      coupon.usage_limit === null || typeof coupon.usage_limit === "number"
        ? coupon.usage_limit
        : null,
    used_count:
      coupon.used_count === null || typeof coupon.used_count === "number"
        ? coupon.used_count
        : null,
    starts_at: typeof coupon.starts_at === "string" ? coupon.starts_at : null,
    expires_at: typeof coupon.expires_at === "string" ? coupon.expires_at : null,
  };
};

export const readCheckoutDraft = (): CheckoutDraft => {
  if (typeof window === "undefined") return emptyDraft;

  try {
    const raw = window.localStorage.getItem(checkoutDraftStorageKey);
    if (!raw) return emptyDraft;

    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
      wantsScheduledPickup: parsed.wantsScheduledPickup === true,
      scheduledFor: typeof parsed.scheduledFor === "string" ? parsed.scheduledFor : "",
      selectedAddons: normalizeSelectedAddons(parsed.selectedAddons),
      method: isPaymentMethod(parsed.method) ? parsed.method : "pix",
      checkoutStep: isCheckoutStep(parsed.checkoutStep) ? parsed.checkoutStep : 1,
      couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : "",
      appliedCoupon: normalizeStoredCoupon(parsed.appliedCoupon),
    };
  } catch {
    return emptyDraft;
  }
};

export const writeCheckoutDraft = (draft: CheckoutDraft) => {
  if (typeof window === "undefined") return;

  const hasContent =
    draft.name.trim() ||
    draft.phone.trim() ||
    draft.note.trim() ||
    draft.wantsScheduledPickup ||
    draft.scheduledFor.trim() ||
    Object.keys(draft.selectedAddons).length > 0 ||
    draft.method !== "pix" ||
    draft.checkoutStep !== 1 ||
    draft.couponCode.trim() ||
    draft.appliedCoupon;

  if (!hasContent) {
    window.localStorage.removeItem(checkoutDraftStorageKey);
    return;
  }

  window.localStorage.setItem(checkoutDraftStorageKey, JSON.stringify(draft));
};

export const clearCheckoutDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(checkoutDraftStorageKey);
};
