"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  getBusinessHours,
  getNextOpeningLabel,
  getTodayBusinessHoursLabel,
  isWithinBusinessHours,
  weeklyBusinessHours,
  type BusinessHours,
} from "../lib/storeHours";
import { useMediaQuery } from "../lib/useMediaQuery";
import {
  defaultMenuCategories,
  getCategoryLabel,
  getCategoryOrder,
  sortCategories,
  type MenuCategory,
} from "../lib/menuCategories";
import { MenuItem } from "../types";
import { useCart } from "./context/CartContext";

type CartLine = MenuItem & { quantity: number };

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const sortItems = (menuItems: MenuItem[]) =>
  [...menuItems].sort((a, b) => {
    const aOrder =
      typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "pt-BR");
  });

const isItemOrderable = (item?: MenuItem) =>
  Boolean(item) &&
  item?.active !== false &&
  item?.available !== false &&
  item?.unavailable !== true &&
  item?.availability_status !== "inativo" &&
  item?.availability_status !== "esgotado";

export default function Page() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [openCart, setOpenCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>(defaultMenuCategories);
  const { addToCart, cart, increase, decrease, remove, total } = useCart();
  const [cartNotice, setCartNotice] = useState("");
  const [storeOpen, setStoreOpen] = useState(true);
  const [manualOpen, setManualOpen] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(weeklyBusinessHours);
  const [averageTime, setAverageTime] = useState("35 a 50 min");
  const [topItems, setTopItems] = useState<Record<number, number>>({});

  useEffect(() => {
    async function fetchMenuData() {
      const [{ data: menuData, error: menuError }, { data: categoryData }] =
        await Promise.all([
          supabase
            .from("menu")
            .select("*")
            .order("category", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("menu_categories")
            .select("*")
            .order("sort_order", { ascending: true }),
        ]);

      if (categoryData?.length) {
        setCategories(sortCategories(categoryData as MenuCategory[]));
      }

      if (!menuError && menuData) setItems(menuData as MenuItem[]);
    }

    fetchMenuData();
  }, []);

  useEffect(() => {
    async function fetchOperationalData() {
      const { data: settings } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (settings) {
        const manuallyOpen = settings.is_open !== false;
        const savedBusinessHours = getBusinessHours(settings.business_hours);
        setBusinessHours(savedBusinessHours);
        setManualOpen(manuallyOpen);
        setStoreOpen(manuallyOpen && isWithinBusinessHours(new Date(), savedBusinessHours));
        if (settings.average_time) setAverageTime(String(settings.average_time));
      } else {
        setStoreOpen(isWithinBusinessHours(new Date(), weeklyBusinessHours));
      }

      const { data: orders } = await supabase.from("orders").select("items").limit(200);
      if (orders) {
        const ranking = new Map<number, number>();
        orders.forEach((order: { items?: CartLine[] }) => {
          (Array.isArray(order.items) ? order.items : []).forEach((item) => {
            ranking.set(item.id, (ranking.get(item.id) || 0) + (item.quantity || 1));
          });
        });
        setTopItems(Object.fromEntries(ranking.entries()));
      }
    }

    fetchOperationalData();
  }, []);

  useEffect(() => {
    if (!items.length || !cart.length) return;

    const unavailableCartItems = cart.filter((cartItem) => {
      const menuItem = items.find((item) => item.id === cartItem.id);
      return !isItemOrderable(menuItem);
    });

    if (unavailableCartItems.length === 0) return;

    unavailableCartItems.forEach((item) => remove(item.id));
    const timer = window.setTimeout(() => {
      setCartNotice(
        unavailableCartItems.length === 1
          ? `${unavailableCartItems[0].name} foi removido do carrinho porque esta pausado ou indisponivel.`
          : "Alguns itens foram removidos do carrinho porque estao pausados ou indisponiveis."
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cart, items, remove]);

  const groupedItems = useMemo(
    () =>
      items
        .filter((item) => {
          const category = categories.find((entry) => entry.slug === item.category);
          return (
            category?.active !== false &&
            item.active !== false &&
            item.availability_status !== "inativo"
          );
        })
        .reduce((acc, item) => {
          acc[item.category] = acc[item.category] || [];
          acc[item.category].push(item);
          return acc;
        }, {} as Record<string, MenuItem[]>),
    [categories, items]
  );

  const orderedCategories = useMemo(
    () =>
      Object.keys(groupedItems).sort(
        (a, b) => getCategoryOrder(a, categories) - getCategoryOrder(b, categories)
      ),
    [categories, groupedItems]
  );

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCategory = activeCategory || orderedCategories[0] || "";

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    sectionRefs.current[category]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0 || !storeOpen) return;
    sessionStorage.setItem("order", JSON.stringify({ items: cart, total }));
    setOpenCart(false);
    router.push("/checkout");
  };

  const getQuantity = (id: number) =>
    cart.find((item) => item.id === id)?.quantity || 0;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={{ ...styles.headerInner, ...(isMobile ? styles.headerInnerMobile : {}) }}>
          <div>
            <p style={styles.eyebrow}>Cardápio online</p>
            <h1 style={styles.brand}>Missô Sushi</h1>
            <p style={styles.headerStatus}>
              {storeOpen
                ? `Aberto - tempo médio de preparo ${averageTime}`
                : "Loja fechada no momento"}
            </p>
            <p style={styles.headerStatus}>
              {getTodayBusinessHoursLabel(new Date(), businessHours)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenCart(true)}
            style={styles.headerCartButton}
            aria-label="Abrir carrinho"
          >
            <span style={styles.headerCartCount}>{itemCount}</span>
            {money(total)}
          </button>
        </div>
      </header>

      <section style={styles.intro}>
        <div style={styles.introInner}>
          <div style={styles.introCopy}>
            <p style={styles.kicker}>Sushi, sashimi e pratos japoneses</p>
            <h2 style={styles.title}>Escolha seus pratos favoritos</h2>
            {!storeOpen && (
              <p style={styles.closedNotice}>
                {manualOpen
                  ? `A loja esta fechada no momento e ${getNextOpeningLabel(
                      new Date(),
                      businessHours
                    )}.`
                  : `A loja esta fechada manualmente e ${getNextOpeningLabel(
                      new Date(),
                      businessHours
                    )}.`}
              </p>
            )}
          </div>
          <div style={{ ...styles.summaryPanel, ...(isMobile ? styles.summaryPanelMobile : {}) }}>
            <span style={styles.summaryLabel}>Seu pedido</span>
            <strong style={styles.summaryValue}>{money(total)}</strong>
            <span style={styles.summaryNote}>
              {itemCount === 0 ? "Carrinho vazio" : `${itemCount} itens`}
            </span>
          </div>
        </div>
      </section>

      <nav style={styles.categoryNav} aria-label="Categorias do cardápio">
        <div style={styles.categoryTrack}>
          {orderedCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryClick(category)}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === category ? styles.categoryButtonActive : {}),
              }}
            >
              {getCategoryLabel(category, categories)}
            </button>
          ))}
        </div>
      </nav>

      <div style={styles.content}>
        {orderedCategories.map((category) => {
          const itemsInCategory = sortItems(groupedItems[category]);

          return (
            <section
              key={category}
              ref={(element) => {
                sectionRefs.current[category] = element;
              }}
              style={styles.categorySection}
            >
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>Categoria</p>
                  <h3 style={styles.sectionTitle}>
                    {getCategoryLabel(category, categories)}
                  </h3>
                </div>
                <span style={styles.sectionCount}>
                  {itemsInCategory.length} itens
                </span>
              </div>

              <div style={styles.menuGrid}>
                {itemsInCategory.map((item) => {
                  const quantity = getQuantity(item.id);
                  const unavailable =
                    item.active === false ||
                    item.available === false ||
                    item.unavailable === true ||
                    item.availability_status === "esgotado" ||
                    item.availability_status === "inativo";
                  const isPopular = (topItems[item.id] || 0) > 0;

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...styles.menuCard,
                        ...(isMobile ? styles.menuCardMobile : {}),
                        ...(unavailable ? styles.menuCardUnavailable : {}),
                      }}
                    >
                      <div style={{ ...styles.imageWrap, ...(isMobile ? styles.imageWrapMobile : {}) }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 720px) 34vw, 160px"
                            style={styles.dishImage}
                          />
                        ) : (
                          <div style={styles.imageFallback}>
                            <span>Missô</span>
                          </div>
                        )}
                      </div>

                      <div style={styles.cardBody}>
                        <div>
                          <h4 style={styles.itemName}>{item.name}</h4>
                          <div style={styles.badgeLine}>
                            {isPopular && <span style={styles.itemBadge}>Mais pedido</span>}
                            {unavailable && (
                              <span style={styles.unavailableBadge}>Indisponivel</span>
                            )}
                          </div>
                          {item.description && (
                            <p style={styles.itemDescription}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div style={{ ...styles.cardFooter, ...(isMobile ? styles.cardFooterMobile : {}) }}>
                          <strong style={styles.price}>
                            {money(Number(item.price))}
                          </strong>

                          {quantity === 0 ? (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              disabled={unavailable || !storeOpen}
                              style={{
                                ...styles.addButton,
                                ...(unavailable || !storeOpen ? styles.addButtonDisabled : {}),
                              }}
                            >
                              {unavailable ? "Esgotado" : "Adicionar"}
                            </button>
                          ) : (
                            <div style={styles.quantityControl}>
                              <button
                                type="button"
                                onClick={() => decrease(item.id)}
                                style={styles.quantityButton}
                                aria-label={`Remover ${item.name}`}
                              >
                                -
                              </button>
                              <span style={styles.quantityValue}>
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => increase(item.id)}
                                style={{
                                  ...styles.quantityButton,
                                  ...styles.quantityButtonDark,
                                }}
                                aria-label={`Adicionar ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {itemCount > 0 && (
        <button
          type="button"
          onClick={() => setOpenCart(true)}
          style={styles.floatingCart}
        >
          <span>Ver carrinho</span>
          <strong>{money(total)}</strong>
        </button>
      )}

      {openCart && (
        <div style={styles.cartOverlay} role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar carrinho"
            onClick={() => setOpenCart(false)}
            style={styles.backdrop}
          />

          <aside style={styles.cartPanel}>
            <div style={styles.cartHeader}>
              <div>
                <p style={styles.cartEyebrow}>Pedido</p>
                <h3 style={styles.cartTitle}>Carrinho</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenCart(false)}
                style={styles.closeButton}
              >
                Fechar
              </button>
            </div>

            <div style={styles.cartList}>
              {cartNotice && <p style={styles.cartNotice}>{cartNotice}</p>}
              {cart.length === 0 ? (
                <p style={styles.emptyCart}>Seu carrinho está vazio.</p>
              ) : (
                cart.map((item: CartLine) => (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={styles.cartItemMain}>
                      <strong style={styles.cartItemName}>{item.name}</strong>
                      <p style={styles.cartItemPrice}>
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                    <div style={styles.quantityControl}>
                      <button
                        type="button"
                        onClick={() => decrease(item.id)}
                        style={styles.quantityButton}
                        aria-label={`Remover ${item.name}`}
                      >
                        -
                      </button>
                      <span style={styles.quantityValue}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => increase(item.id)}
                        style={{
                          ...styles.quantityButton,
                          ...styles.quantityButtonDark,
                        }}
                        aria-label={`Adicionar ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.cartFooter}>
              <div style={styles.totalRow}>
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || !storeOpen}
                style={{
                  ...styles.checkoutButton,
                  ...(cart.length === 0 || !storeOpen ? styles.checkoutButtonDisabled : {}),
                }}
              >
                Finalizar pedido
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f4ef",
    color: "#1c1a17",
    paddingBottom: 112,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 30,
    background: "rgba(247, 244, 239, 0.92)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(14px)",
  },
  headerInner: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerInnerMobile: {
    alignItems: "flex-start",
    gap: 10,
  },
  eyebrow: {
    color: "#766e64",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  brand: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 800,
  },
  headerStatus: {
    marginTop: 5,
    color: "#625b53",
    fontSize: 13,
    fontWeight: 750,
  },
  headerCartButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "#fffdf8",
    borderRadius: 999,
    padding: "9px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#1c1a17",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
    boxShadow: "0 12px 30px rgba(28, 26, 23, 0.06)",
  },
  headerCartCount: {
    width: 26,
    height: 26,
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontSize: 13,
  },
  intro: {
  },
  introInner: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "38px 20px 30px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 24,
    alignItems: "end",
  },
  introCopy: {
    maxWidth: 680,
  },
  kicker: {
    color: "#9f1d2f",
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    fontSize: "clamp(34px, 6vw, 64px)",
    lineHeight: 0.98,
    fontWeight: 850,
    maxWidth: 720,
  },
  closedNotice: {
    marginTop: 14,
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    fontWeight: 800,
    lineHeight: 1.45,
  },
  summaryPanel: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: 18,
    minHeight: 132,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  summaryPanelMobile: {
    minHeight: 104,
  },
  summaryLabel: {
    color: "#d8d0c4",
    fontSize: 13,
    fontWeight: 700,
  },
  summaryValue: {
    fontSize: 30,
    lineHeight: 1,
  },
  summaryNote: {
    color: "#d8d0c4",
    fontSize: 13,
  },
  categoryNav: {
    position: "sticky",
    top: 67,
    zIndex: 20,
    background: "rgba(247, 244, 239, 0.94)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(14px)",
  },
  categoryTrack: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    gap: 8,
    overflowX: "auto",
  },
  categoryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "#fffdf8",
    color: "#514a43",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  categoryButtonActive: {
    background: "#1c1a17",
    borderColor: "#1c1a17",
    color: "#fffdf8",
  },
  content: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "28px 20px",
  },
  categorySection: {
    scrollMarginTop: 140,
    marginBottom: 42,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 3,
    fontSize: 26,
    lineHeight: 1.1,
    fontWeight: 820,
  },
  sectionCount: {
    color: "#766e64",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(290px, 100%), 1fr))",
    gap: 14,
  },
  menuCard: {
    minHeight: 168,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    display: "grid",
    gridTemplateColumns: "132px minmax(0, 1fr)",
    overflow: "hidden",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)",
  },
  menuCardUnavailable: {
    opacity: 0.62,
  },
  menuCardMobile: {
    gridTemplateColumns: "104px minmax(0, 1fr)",
    minHeight: 150,
  },
  imageWrap: {
    position: "relative",
    minHeight: 168,
    background: "#ebe3d6",
  },
  imageWrapMobile: {
    minHeight: 150,
  },
  dishImage: {
    objectFit: "cover",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "#9f1d2f",
    fontWeight: 850,
    background: "linear-gradient(135deg, #efe6d8, #f8f3ea)",
  },
  cardBody: {
    minWidth: 0,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 14,
  },
  itemName: {
    fontSize: 17,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  badgeLine: {
    minHeight: 24,
    marginTop: 7,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  itemBadge: {
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1e40af",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  unavailableBadge: {
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  itemDescription: {
    marginTop: 7,
    color: "#625b53",
    fontSize: 13,
    lineHeight: 1.45,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardFooterMobile: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  price: {
    fontSize: 17,
  },
  addButton: {
    border: "none",
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  quantityControl: {
    height: 38,
    display: "grid",
    gridTemplateColumns: "38px 34px 38px",
    alignItems: "center",
    background: "#f0ebe2",
    borderRadius: 999,
    padding: 2,
  },
  quantityButton: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 800,
  },
  quantityButtonDark: {
    background: "#9f1d2f",
    color: "#fff",
  },
  quantityValue: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: 800,
  },
  floatingCart: {
    position: "fixed",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    zIndex: 25,
    width: "min(520px, calc(100% - 32px))",
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "15px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.24)",
  },
  cartOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    border: "none",
    background: "rgba(28, 26, 23, 0.42)",
    cursor: "pointer",
  },
  cartPanel: {
    position: "relative",
    width: "min(440px, 100%)",
    height: "100%",
    background: "#fffdf8",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-18px 0 45px rgba(28, 26, 23, 0.18)",
  },
  cartHeader: {
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  cartEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  cartTitle: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 1,
  },
  closeButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "#f7f4ef",
    borderRadius: 999,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 800,
  },
  cartList: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
  },
  emptyCart: {
    color: "#625b53",
  },
  cartNotice: {
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.4,
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  cartItemMain: {
    minWidth: 0,
    display: "grid",
    gap: 6,
  },
  cartItemName: {
    display: "block",
    lineHeight: 1.3,
  },
  cartItemPrice: {
    marginTop: 5,
    color: "#625b53",
    fontSize: 13,
  },
  cartFooter: {
    padding: 20,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffdf8",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    fontSize: 18,
  },
  checkoutButton: {
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: 15,
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 16,
  },
  checkoutButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
};
