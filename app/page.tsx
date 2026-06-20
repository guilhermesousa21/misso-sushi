"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "../lib/supabase";
import {
  getBusinessHours,
  getTodayBusinessHoursLabel,
  isStoreAcceptingOrders,
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
import { useCart, type CartItem } from "./context/CartContext";
import { money, isItemOrderable } from "../lib/orderUtils";
import {
  StoreStatusBanner,
  storeStatusBannerHeight,
} from "./components/StoreStatusBanner";
import { MenuPageSkeleton } from "./components/MenuPageSkeleton";

type CartLine = CartItem;

const sortItems = (menuItems: MenuItem[]) =>
  [...menuItems].sort((a, b) => {
    const aOrder =
      typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "pt-BR");
  });

export default function Page() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [openCart, setOpenCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>(defaultMenuCategories);
  const { addToCart, cart, increase, decrease, increaseById, decreaseById, removeById, total } = useCart();
  const [cartNotice, setCartNotice] = useState("");
  const [addedPulseId, setAddedPulseId] = useState<number | null>(null);
  const [storeOpen, setStoreOpen] = useState(true);
  const [manualOpen, setManualOpen] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(weeklyBusinessHours);
  const [averageTime, setAverageTime] = useState("35 a 50 min");
  const [topItems, setTopItems] = useState<Record<number, number>>({});
  const [menuError, setMenuError] = useState("");
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    async function fetchMenuData() {
      if (!supabaseConfigured) {
        setMenuError(
          "Supabase não configurado neste ambiente. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar o cardápio."
        );
        setMenuLoading(false);
        return;
      }

      try {
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

        if (menuError) {
          setMenuError(`Não foi possível carregar o cardápio: ${menuError.message}`);
          return;
        }

        setMenuError("");
        if (menuData) setItems(menuData as MenuItem[]);
      } finally {
        setMenuLoading(false);
      }
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
        setStoreOpen(isStoreAcceptingOrders(manuallyOpen, new Date(), savedBusinessHours));
        if (settings.average_time) setAverageTime(String(settings.average_time));
      } else {
        setStoreOpen(isWithinBusinessHours(new Date(), weeklyBusinessHours));
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("items,payment_status")
        .eq("payment_status", "pago")
        .limit(200);
      if (orders) {
        const ranking = new Map<number, number>();
        orders.forEach((order: { items?: CartLine[]; payment_status?: string }) => {
          if (order.payment_status !== "pago") return;
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
    const timer = window.setInterval(() => {
      setStoreOpen(isStoreAcceptingOrders(manualOpen, new Date(), businessHours));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [manualOpen, businessHours]);

  useEffect(() => {
    if (!items.length || !cart.length) return;

    const unavailableCartItems = cart.filter((cartItem) => {
      const menuItem = items.find((item) => item.id === cartItem.id);
      return !isItemOrderable(menuItem);
    });

    if (unavailableCartItems.length === 0) return;

    unavailableCartItems.forEach((item) => removeById(item.id));
    const timer = window.setTimeout(() => {
      setCartNotice(
        unavailableCartItems.length === 1
          ? `${unavailableCartItems[0].name} foi removido do carrinho porque está pausado ou indisponível.`
          : "Alguns itens foram removidos do carrinho porque estão pausados ou indisponíveis."
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cart, items, removeById]);

  const orderableItems = useMemo(
    () =>
      items.filter((item) => {
        const category = categories.find((entry) => entry.slug === item.category);
        return (
          category?.active !== false &&
          item.active !== false &&
          item.availability_status !== "inativo"
        );
      }),
    [categories, items]
  );

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!query) return orderableItems;

    return orderableItems.filter((item) =>
      [item.name, item.description || "", getCategoryLabel(item.category, categories)]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    );
  }, [categories, orderableItems, searchTerm]);

  const groupedItems = useMemo(
    () =>
      filteredItems.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>),
    [filteredItems]
  );

  const categoryOrderByItem = useMemo(() => {
    const orderMap = new Map<string, number>();

    orderableItems.forEach((item) => {
      if (typeof item.category_order !== "number") return;

      const currentOrder = orderMap.get(item.category);
      if (currentOrder === undefined || item.category_order < currentOrder) {
        orderMap.set(item.category, item.category_order);
      }
    });

    return orderMap;
  }, [orderableItems]);

  const orderedCategories = useMemo(
    () =>
      Object.keys(groupedItems).sort(
        (a, b) =>
          (categoryOrderByItem.get(a) ?? getCategoryOrder(a, categories)) -
          (categoryOrderByItem.get(b) ?? getCategoryOrder(b, categories))
      ),
    [categories, categoryOrderByItem, groupedItems]
  );

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCategory = activeCategory || orderedCategories[0] || "";
  const popularItems = useMemo(
    () =>
      orderableItems
        .filter((item) => (topItems[item.id] || 0) > 0)
        .sort((a, b) => (topItems[b.id] || 0) - (topItems[a.id] || 0))
        .slice(0, 4),
    [orderableItems, topItems]
  );
  const showPopular = !searchTerm.trim() && popularItems.length > 0;

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    sectionRefs.current[category]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0 || !storeOpen) return;
    setOpenCart(false);
    router.push("/checkout");
  };

  const getQuantity = (id: number) =>
    cart.filter((item) => item.id === id).reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    setAddedPulseId(item.id);
    window.setTimeout(() => setAddedPulseId((current) => (current === item.id ? null : current)), 280);
  };

  const handleIncrease = (id: number) => {
    increaseById(id);
    setAddedPulseId(id);
    window.setTimeout(() => setAddedPulseId((current) => (current === id ? null : current)), 280);
  };

  return (
    <main style={{ ...styles.page, paddingTop: storeStatusBannerHeight }}>
      <StoreStatusBanner
        storeOpen={storeOpen}
        manualOpen={manualOpen}
        businessHours={businessHours}
        averageTime={averageTime}
      />
      <header style={{ ...styles.header, top: storeStatusBannerHeight }}>
        <div style={{ ...styles.headerInner, ...(isMobile ? styles.headerInnerMobile : {}) }}>
          <div>
            <h1 style={styles.brand}>Missô Sushi</h1>
            <p style={styles.headerStatus}>
              {storeOpen
                ? `Tempo médio de preparo: ${averageTime}`
                : "Pedidos pausados no momento"}
            </p>
            <p style={styles.headerHours}>
              {getTodayBusinessHoursLabel(new Date(), businessHours)}
            </p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/meus-pedidos" style={styles.headerLink}>
              Meus pedidos
            </Link>
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
        </div>
      </header>

      <section style={styles.intro}>
        <div style={styles.introInner}>
          <div style={styles.introCopy}>
            <p style={styles.kicker}>Sushi, sashimi e pratos japoneses</p>
            <h2 style={styles.title}>Escolha seus pratos favoritos</h2>
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

      {menuLoading && !menuError ? (
        <div style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
          <MenuPageSkeleton isMobile={isMobile} />
        </div>
      ) : (
        <>
      <nav style={styles.categoryNav} aria-label="Categorias do cardápio">
        <div style={styles.searchRow}>
          <label style={styles.searchBox}>
            <span style={styles.searchIcon}>⌕</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar prato"
              style={styles.searchInput}
            />
          </label>
        </div>
        <div style={{ ...styles.categoryBar, ...(isMobile ? styles.categoryBarMobile : {}) }}>
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
        </div>
      </nav>

      <div style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        {showPopular && (
          <section style={{ ...styles.categorySection, ...(isMobile ? styles.categorySectionMobile : {}) }}>
            <div style={{ ...styles.sectionHeader, ...(isMobile ? styles.sectionHeaderMobile : {}) }}>
              <div>
                <p style={styles.sectionEyebrow}>Favoritos</p>
                <h3 style={{ ...styles.sectionTitle, ...(isMobile ? styles.sectionTitleMobile : {}) }}>Mais pedidos</h3>
              </div>
              <span style={styles.sectionCount}>{popularItems.length} itens</span>
            </div>
            <div style={{ ...styles.menuGrid, ...(isMobile ? styles.menuGridMobile : {}) }}>
              {popularItems.map((item) => {
                const quantity = getQuantity(item.id);
                const unavailable = !isItemOrderable(item);

                return (
                  <article
                    key={`popular-${item.id}`}
                    style={{
                      ...styles.menuCard,
                      ...(isMobile ? styles.menuCardMobile : {}),
                      ...(unavailable ? styles.menuCardUnavailable : {}),
                      ...(addedPulseId === item.id ? styles.menuCardPulse : {}),
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

                    <div style={{ ...styles.cardBody, ...(isMobile ? styles.cardBodyMobile : {}) }}>
                      <div>
                        <h4 style={{ ...styles.itemName, ...(isMobile ? styles.itemNameMobile : {}) }}>{item.name}</h4>
                        {unavailable && (
                          <div style={styles.badgeLine}>
                            <span style={styles.unavailableBadge}>Indisponível</span>
                          </div>
                        )}
                        {item.description && (
                          <p style={{ ...styles.itemDescription, ...(isMobile ? styles.itemDescriptionMobile : {}) }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div style={{ ...styles.cardFooter, ...(isMobile ? styles.cardFooterMobile : {}) }}>
                        <strong style={{ ...styles.price, ...(isMobile ? styles.priceMobile : {}) }}>{money(Number(item.price))}</strong>
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            disabled={unavailable || !storeOpen}
                            style={{
                              ...styles.addButton,
                              ...(isMobile ? styles.addButtonMobile : {}),
                              ...(unavailable || !storeOpen ? styles.addButtonDisabled : {}),
                            }}
                            aria-label={unavailable ? `${item.name} indisponível` : `Adicionar ${item.name}`}
                          >
                            {unavailable ? "Indisponível" : "Adicionar"}
                          </button>
                        ) : (
                          <div style={{ ...styles.quantityControl, ...(isMobile ? styles.quantityControlMobile : {}) }}>
                            <button type="button" onClick={() => decreaseById(item.id)} style={{ ...styles.quantityButton, ...(isMobile ? styles.quantityButtonMobile : {}) }} aria-label={`Remover ${item.name}`}>-</button>
                            <span style={{ ...styles.quantityValue, ...(isMobile ? styles.quantityValueMobile : {}) }}>{quantity}</span>
                            <button type="button" onClick={() => handleIncrease(item.id)} style={{ ...styles.quantityButton, ...styles.quantityButtonDark, ...(isMobile ? styles.quantityButtonMobile : {}) }} aria-label={`Adicionar ${item.name}`}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {menuError && (
          <section style={styles.emptySearch}>
            <h3>Cardápio não carregou</h3>
            <p>{menuError}</p>
          </section>
        )}

        {!menuError && orderedCategories.length === 0 && (
          <section style={styles.emptySearch}>
            <h3>Nenhum prato encontrado</h3>
            <p>Confira o termo digitado ou escolha outra categoria.</p>
          </section>
        )}

        {orderedCategories.map((category) => {
          const itemsInCategory = sortItems(groupedItems[category]);

          return (
            <section
              key={category}
              ref={(element) => {
                sectionRefs.current[category] = element;
              }}
              style={{ ...styles.categorySection, ...(isMobile ? styles.categorySectionMobile : {}) }}
            >
              <div style={{ ...styles.sectionHeader, ...(isMobile ? styles.sectionHeaderMobile : {}) }}>
                <div>
                  <p style={styles.sectionEyebrow}>Categoria</p>
                  <h3 style={{ ...styles.sectionTitle, ...(isMobile ? styles.sectionTitleMobile : {}) }}>
                    {getCategoryLabel(category, categories)}
                  </h3>
                </div>
                <span style={styles.sectionCount}>
                  {itemsInCategory.length} itens
                </span>
              </div>

              <div style={{ ...styles.menuGrid, ...(isMobile ? styles.menuGridMobile : {}) }}>
                {itemsInCategory.map((item) => {
                  const quantity = getQuantity(item.id);
                  const unavailable = !isItemOrderable(item);

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...styles.menuCard,
                        ...(isMobile ? styles.menuCardMobile : {}),
                        ...(unavailable ? styles.menuCardUnavailable : {}),
                        ...(addedPulseId === item.id ? styles.menuCardPulse : {}),
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

                      <div style={{ ...styles.cardBody, ...(isMobile ? styles.cardBodyMobile : {}) }}>
                        <div>
                          <h4 style={{ ...styles.itemName, ...(isMobile ? styles.itemNameMobile : {}) }}>{item.name}</h4>
                          {unavailable && (
                            <div style={styles.badgeLine}>
                              <span style={styles.unavailableBadge}>Indisponível</span>
                            </div>
                          )}
                          {item.description && (
                            <p style={{ ...styles.itemDescription, ...(isMobile ? styles.itemDescriptionMobile : {}) }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div style={{ ...styles.cardFooter, ...(isMobile ? styles.cardFooterMobile : {}) }}>
                          <strong style={{ ...styles.price, ...(isMobile ? styles.priceMobile : {}) }}>
                            {money(Number(item.price))}
                          </strong>

                          {quantity === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item)}
                              disabled={unavailable || !storeOpen}
                              style={{
                                ...styles.addButton,
                                ...(isMobile ? styles.addButtonMobile : {}),
                                ...(unavailable || !storeOpen ? styles.addButtonDisabled : {}),
                              }}
                              aria-label={unavailable ? `${item.name} indisponível` : `Adicionar ${item.name}`}
                            >
                              {unavailable ? "Indisponível" : "Adicionar"}
                            </button>
                          ) : (
                            <div style={{ ...styles.quantityControl, ...(isMobile ? styles.quantityControlMobile : {}) }}>
                              <button
                                type="button"
                                onClick={() => decreaseById(item.id)}
                                style={{ ...styles.quantityButton, ...(isMobile ? styles.quantityButtonMobile : {}) }}
                                aria-label={`Remover ${item.name}`}
                              >
                                -
                              </button>
                              <span style={{ ...styles.quantityValue, ...(isMobile ? styles.quantityValueMobile : {}) }}>
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrease(item.id)}
                                style={{
                                  ...styles.quantityButton,
                                  ...styles.quantityButtonDark,
                                  ...(isMobile ? styles.quantityButtonMobile : {}),
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
        </>
      )}

      {itemCount > 0 && (
        <button
          type="button"
          onClick={() => setOpenCart(true)}
          style={styles.floatingCart}
        >
          <span>Ver carrinho · {itemCount === 1 ? "1 item" : `${itemCount} itens`}</span>
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
                <p style={styles.cartMeta}>{itemCount === 1 ? "1 item" : `${itemCount} itens`}</p>
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
                  <div key={item.lineKey} style={styles.cartItem}>
                    <div style={styles.cartItemMain}>
                      <strong style={styles.cartItemName}>{item.name}</strong>
                      {item.modifiers?.length ? (
                        <p style={styles.cartItemModifiers}>{item.modifiers.join(", ")}</p>
                      ) : null}
                      <p style={styles.cartItemPrice}>
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                    <div style={styles.quantityControl}>
                      <button
                        type="button"
                        onClick={() => decrease(item.lineKey)}
                        style={styles.quantityButton}
                        aria-label={`Remover ${item.name}`}
                      >
                        -
                      </button>
                      <span style={styles.quantityValue}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => increase(item.lineKey)}
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
              <div style={styles.cartSubtotalRow}>
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  headerLink: {
    color: "#8f1728",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 850,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 999,
    padding: "9px 13px",
    whiteSpace: "nowrap",
  },
  eyebrow: {
    color: "#766e64",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  brand: {
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
  headerHours: {
    marginTop: 3,
    color: "#766e64",
    fontSize: 12,
    fontWeight: 650,
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
    minHeight: 148,
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
    background: "rgba(247, 244, 239, 0.96)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(14px)",
  },
  categoryBar: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 20px 10px",
  },
  categoryBarMobile: {
    padding: "0 16px 10px",
  },
  searchRow: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "10px 20px 8px",
  },
  searchBox: {
    height: 38,
    width: "100%",
    maxWidth: 320,
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(28, 26, 23, 0.1)",
    background: "#fffdf8",
    borderRadius: 999,
    padding: "0 12px",
  },
  searchIcon: {
    color: "#766e64",
    fontSize: 15,
    lineHeight: 1,
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#1c1a17",
    fontSize: 14,
    fontWeight: 700,
  },
  categoryTrack: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
  },
  categoryButton: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    background: "rgba(255, 253, 248, 0.74)",
    color: "#514a43",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
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
  contentMobile: {
    padding: "16px 12px 88px",
  },
  categorySection: {
    scrollMarginTop: 140,
    marginBottom: 42,
  },
  categorySectionMobile: {
    scrollMarginTop: 126,
    marginBottom: 28,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
    marginBottom: 14,
  },
  sectionHeaderMobile: {
    marginBottom: 9,
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
  sectionTitleMobile: {
    fontSize: 21,
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
  menuGridMobile: {
    gap: 8,
  },
  menuCard: {
    minHeight: 132,
    background: "#fffdf8",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    display: "grid",
    gridTemplateColumns: "116px minmax(0, 1fr)",
    overflow: "hidden",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  menuCardPulse: {
    transform: "scale(1.015)",
    borderColor: "rgba(159, 29, 47, 0.36)",
    boxShadow: "0 16px 38px rgba(159, 29, 47, 0.14)",
  },
  menuCardUnavailable: {
    opacity: 0.62,
  },
  menuCardMobile: {
    gridTemplateColumns: "82px minmax(0, 1fr)",
    minHeight: 104,
  },
  imageWrap: {
    position: "relative",
    minHeight: 148,
    background: "#ebe3d6",
  },
  imageWrapMobile: {
    minHeight: 104,
  },
  dishImage: {
    objectFit: "cover",
    objectPosition: "center",
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
    padding: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 14,
  },
  cardBodyMobile: {
    padding: "9px 10px",
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  itemNameMobile: {
    fontSize: 14,
    lineHeight: 1.18,
  },
  badgeLine: {
    minHeight: 24,
    marginTop: 7,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
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
    marginTop: 5,
    color: "#625b53",
    fontSize: 12,
    lineHeight: 1.4,
  },
  itemDescriptionMobile: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 1.25,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardFooterMobile: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  price: {
    fontSize: 16,
  },
  priceMobile: {
    fontSize: 14,
  },
  addButton: {
    border: "none",
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 999,
    padding: "9px 13px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonMobile: {
    padding: "7px 10px",
    fontSize: 12,
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
  quantityControlMobile: {
    height: 32,
    gridTemplateColumns: "32px 28px 32px",
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
  quantityButtonMobile: {
    width: 28,
    height: 28,
    fontSize: 15,
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
  quantityValueMobile: {
    fontSize: 12,
  },
  floatingCart: {
    position: "fixed",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    zIndex: 25,
    width: "min(360px, calc(100% - 32px))",
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "13px 16px",
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
  cartMeta: {
    marginTop: 5,
    color: "#766e64",
    fontSize: 13,
    fontWeight: 750,
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
    padding: "12px 20px",
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
    padding: "12px 0",
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
  cartItemModifiers: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
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
  cartSubtotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    color: "#625b53",
    fontSize: 14,
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
  emptySearch: {
    borderRadius: 8,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    padding: 24,
    color: "#625b53",
  },
};
