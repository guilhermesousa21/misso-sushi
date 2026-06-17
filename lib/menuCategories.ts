export type MenuCategory = {
  id?: number;
  slug: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
};

export const defaultMenuCategories: MenuCategory[] = [
  { slug: "entradas", name: "Entradas quentes", sort_order: 0, active: true },
  { slug: "frio", name: "Entradas frias", sort_order: 1, active: true },
  { slug: "sashimi", name: "Sashimis", sort_order: 2, active: true },
  { slug: "jyo", name: "Jyos", sort_order: 3, active: true },
  { slug: "niguiri", name: "Niguiris", sort_order: 4, active: true },
  { slug: "hot", name: "Hot rolls", sort_order: 5, active: true },
  { slug: "temaki", name: "Temakis", sort_order: 6, active: true },
  { slug: "yakissoba", name: "Yakissoba", sort_order: 7, active: true },
  { slug: "executivo", name: "Executivos", sort_order: 8, active: true },
  { slug: "poke", name: "Pokes", sort_order: 9, active: true },
  { slug: "combinado", name: "Combinados", sort_order: 10, active: true },
  { slug: "sobremesa", name: "Sobremesas", sort_order: 11, active: true },
  { slug: "bebida", name: "Bebidas", sort_order: 12, active: true },
  { slug: "drink", name: "Drinks", sort_order: 13, active: true },
  { slug: "destilado", name: "Destilados", sort_order: 14, active: true },
];

export const normalizeCategorySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getCategoryLabel = (
  slug: string,
  categories: MenuCategory[] = defaultMenuCategories
) => categories.find((category) => category.slug === slug)?.name || slug;

export const getCategoryOrder = (
  slug: string,
  categories: MenuCategory[] = defaultMenuCategories
) => {
  const category = categories.find((item) => item.slug === slug);
  return typeof category?.sort_order === "number"
    ? category.sort_order
    : defaultMenuCategories.length;
};

export const sortCategories = (categories: MenuCategory[]) =>
  [...categories].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, "pt-BR");
  });
