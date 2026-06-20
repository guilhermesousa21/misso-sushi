// types.ts
export type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  category_order?: number | null;
  sort_order?: number | null;
  description?: string;
  image?: string;
  active?: boolean | null;
  available?: boolean | null;
  unavailable?: boolean | null;
  availability_status?: string | null;
  featured?: boolean | null;
  created_at?: string;
};

export type OrderDiscount = {
  subtotal?: number | null;
  discount_amount?: number | null;
  coupon_code?: string | null;
  promotion_id?: number | null;
};

export type OrderAddon = {
  id: string;
  name: string;
  quantity: number;
};
