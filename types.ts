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
  created_at?: string;
};
