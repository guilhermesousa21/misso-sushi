"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, ClipboardList, Search, ShoppingBag, X } from "lucide-react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import {
  getBusinessHours,
  getTodayBusinessHoursLabel,
  isStoreAcceptingOrders,
  isWithinBusinessHours,
  weeklyBusinessHours,
  type BusinessHours,
} from "../lib/storeHours";
import { getAverageTimeLabel } from "../lib/orderFeatures";
import { useIsMobile } from "../lib/useMediaQuery";
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
import { BrandLogo } from "./components/BrandLogo";
import { MenuItemCard } from "./components/MenuItemCard";
import { MenuPageSkeleton } from "./components/MenuPageSkeleton";
import { colors } from "../lib/designTokens";
import { readMenuBrowseDraft, writeMenuBrowseDraft } from "../lib/menuBrowseDraft";
import { clearPixPaymentSession } from "../lib/pixPaymentSession";

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
  const isMobile = useIsMobile();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [menuBrowseReady, setMenuBrowseReady] = useState(false);
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
  const [averageTime, setAverageTime] = useState(getAverageTimeLabel(null));
  const [topItems, setTopItems] = useState<Record<number, number>>({});
  const [menuError, setMenuError] = useState("");
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    const draft = readMenuBrowseDraft();
    if (draft.searchTerm) setSearchTerm(draft.searchTerm);
    if (draft.activeCategory) setActiveCategory(draft.activeCategory);
    if (draft.openCart) setOpenCart(true);
    setMenuBrowseReady(true);
  }, []);

  useEffect(() => {
    if (!menuBrowseReady) return;

    const timer = window.setTimeout(() => {
      writeMenuBrowseDraft({
        searchTerm,
        activeCategory,
        scrollY: window.scrollY,
        openCart,
      });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [menuBrowseReady, searchTerm, activeCategory, openCart]);

  useEffect(() => {
    if (!menuBrowseReady || menuLoading) return;

    const draft = readMenuBrowseDraft();
    if (draft.scrollY <= 0) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, draft.scrollY);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [menuBrowseReady, menuLoading]);

  useEffect(() => {
    if (!menuBrowseReady) return;

    const saveScroll = () => {
      writeMenuBrowseDraft({
        searchTerm,
        activeCategory,
        scrollY: window.scrollY,
        openCart,
      });
    };

    let scrollTimer: number | undefined;
    const onScroll = () => {
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(saveScroll, 180);
    };

    window.addEventListener("pagehide", saveScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("pagehide", saveScroll);
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer) window.clearTimeout(scrollTimer);
    };
  }, [menuBrowseReady, searchTerm, activeCategory, openCart]);

  useEffect(() => {
    if (!openCart) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openCart]);

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
        setAverageTime(getAverageTimeLabel(settings));
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
    clearPixPaymentSession();
    writeMenuBrowseDraft({
      searchTerm,
      activeCategory,
      scrollY: window.scrollY,
      openCart: false,
    });
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
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <div style={{ ...styles.headerInner, ...(isMobile ? styles.headerInnerMobile : {}) }}>
          <div>
            <BrandLogo size={isMobile ? "sm" : "md"} />
            <p style={styles.headerStatus}>
              <span
                className={`status-dot ${storeOpen ? "status-dot--open" : "status-dot--closed"}`}
                aria-hidden
              />
              {storeOpen
                ? `Aberto · preparo em ${averageTime}`
                : "Pedidos pausados no momento"}
            </p>
            <p style={styles.headerHours}>
              <Clock3 size={12} strokeWidth={2.2} style={styles.headerHoursIcon} />
              {getTodayBusinessHoursLabel(new Date(), businessHours)}
            </p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/meus-pedidos" style={{ ...styles.headerLink, ...(isMobile ? styles.headerLinkMobile : {}) }}>
              <ClipboardList size={14} strokeWidth={2.2} />
              {isMobile ? "Pedidos" : "Meus pedidos"}
            </Link>
            <button
              type="button"
              onClick={() => setOpenCart(true)}
              style={{
                ...styles.headerCartButton,
                ...(isMobile ? styles.headerCartButtonHidden : {}),
              }}
              aria-label="Abrir carrinho"
            >
              <span style={styles.headerCartCount}>{itemCount}</span>
              {money(total)}
            </button>
          </div>
        </div>
      </header>

      {menuLoading && !menuError ? (
        <div style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
          <MenuPageSkeleton isMobile={isMobile} />
        </div>
      ) : (
        <>
      <nav style={{ ...styles.categoryNav, ...(isMobile ? styles.categoryNavMobile : {}) }} aria-label="Categorias do cardápio">
        <div style={{ ...styles.searchRow, ...(isMobile ? styles.searchRowMobile : {}) }}>
          <label style={{ ...styles.searchBox, ...(isMobile ? styles.searchBoxMobile : {}) }}>
            <Search size={15} strokeWidth={2.2} style={styles.searchIcon} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="O que você quer hoje?"
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
            <div style={{ ...styles.featuredGrid, ...(isMobile ? styles.featuredGridMobile : {}) }}>
              {popularItems.map((item) => (
                <MenuItemCard
                  key={`popular-${item.id}`}
                  item={item}
                  quantity={getQuantity(item.id)}
                  unavailable={!isItemOrderable(item)}
                  storeOpen={storeOpen}
                  isMobile={isMobile}
                  isPulsing={addedPulseId === item.id}
                  variant="featured"
                  showPopularBadge
                  onAdd={() => handleAddToCart(item)}
                  onIncrease={() => handleIncrease(item.id)}
                  onDecrease={() => decreaseById(item.id)}
                />
              ))}
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
                {itemsInCategory.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={getQuantity(item.id)}
                    unavailable={!isItemOrderable(item)}
                    storeOpen={storeOpen}
                    isMobile={isMobile}
                    isPulsing={addedPulseId === item.id}
                    onAdd={() => handleAddToCart(item)}
                    onIncrease={() => handleIncrease(item.id)}
                    onDecrease={() => decreaseById(item.id)}
                  />
                ))}
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
          <span style={styles.floatingCartLabel}>
            <ShoppingBag size={16} strokeWidth={2.2} />
            Ver carrinho · {itemCount === 1 ? "1 item" : `${itemCount} itens`}
          </span>
          <strong>{money(total)}</strong>
        </button>
      )}

      {openCart && (
        <div style={{ ...styles.cartOverlay, ...(isMobile ? styles.cartOverlayMobile : {}) }} role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar carrinho"
            onClick={() => setOpenCart(false)}
            style={styles.backdrop}
            className="cart-backdrop-animate"
          />

          <aside
            style={{ ...styles.cartPanel, ...(isMobile ? styles.cartPanelMobile : {}) }}
            className={isMobile ? "cart-panel-animate-mobile" : "cart-panel-animate"}
          >
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
                aria-label="Fechar carrinho"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div style={styles.cartList}>
              {cartNotice && <p style={styles.cartNotice}>{cartNotice}</p>}
              {cart.length === 0 ? (
                <div style={styles.emptyCartWrap}>
                  <ShoppingBag size={36} strokeWidth={1.5} color={colors.textSubtle} />
                  <p style={styles.emptyCart}>Seu carrinho está vazio.</p>
                  <button type="button" onClick={() => setOpenCart(false)} style={styles.emptyCartButton}>
                    Ver cardápio
                  </button>
                </div>
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
                    <div
                      style={{
                        ...styles.quantityControl,
                        ...(isMobile ? styles.quantityControlMobile : {}),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => decrease(item.lineKey)}
                        style={{
                          ...styles.quantityButton,
                          ...(isMobile ? styles.quantityButtonMobile : {}),
                        }}
                        aria-label={`Remover ${item.name}`}
                      >
                        -
                      </button>
                      <span style={{ ...styles.quantityValue, ...(isMobile ? styles.quantityValueMobile : {}) }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increase(item.lineKey)}
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
                  </div>
                ))
              )}
            </div>

            <div style={styles.cartFooter}>
              <div style={styles.cartFooterTotal}>
                <span>Total do pedido</span>
                <strong>{money(total)}</strong>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || !storeOpen}
                style={{
                  ...styles.checkoutButton,
                  ...(isMobile ? styles.checkoutButtonMobile : {}),
                  ...(cart.length === 0 || !storeOpen ? styles.checkoutButtonDisabled : {}),
                }}
              >
                {isMobile ? `Pagamento · ${money(total)}` : `Ir para pagamento · ${money(total)}`}
              </button>
              {!storeOpen && cart.length > 0 && (
                <p style={styles.cartClosedNote}>Pedidos pausados no momento. Veja o horário no topo da página.</p>
              )}
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
  pageMobile: {
    paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 30,
    background: "rgba(247, 244, 239, 0.92)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(14px)",
  },
  headerMobile: {
    paddingTop: "env(safe-area-inset-top, 0px)",
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
    color: colors.brandDark,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 850,
    background: colors.surface,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 999,
    padding: "9px 13px",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
  },
  headerLinkMobile: {
    padding: "10px 12px",
    fontSize: 12,
  },
  eyebrow: {
    color: "#766e64",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  headerStatus: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: 750,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerHours: {
    marginTop: 4,
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: 650,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  headerHoursIcon: {
    flexShrink: 0,
    opacity: 0.8,
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
  headerCartButtonHidden: {
    display: "none",
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
  closedNotice: {
    marginTop: 14,
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    fontWeight: 800,
    lineHeight: 1.45,
  },
  categoryNav: {
    position: "sticky",
    top: 67,
    zIndex: 20,
    background: "rgba(247, 244, 239, 0.96)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  categoryNavMobile: {
    top: 118,
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
  searchRowMobile: {
    padding: "10px 16px 8px",
  },
  searchBox: {
    height: 44,
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
  searchBoxMobile: {
    maxWidth: "100%",
  },
  searchIcon: {
    color: colors.textSubtle,
    flexShrink: 0,
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
    padding: "10px 14px",
    minHeight: 44,
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
    padding: "16px 12px calc(96px + env(safe-area-inset-bottom, 0px))",
  },
  categorySection: {
    scrollMarginTop: 140,
    marginBottom: 42,
  },
  categorySectionMobile: {
    scrollMarginTop: 150,
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
  featuredGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    gap: 16,
  },
  featuredGridMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  quantityControl: {
    display: "inline-grid",
    gridTemplateColumns: "36px 28px 36px",
    alignItems: "center",
    justifyItems: "center",
    background: "#f0ebe2",
    borderRadius: 999,
    padding: 4,
    flexShrink: 0,
  },
  quantityControlMobile: {
    gridTemplateColumns: "38px 24px 38px",
    padding: 3,
  },
  quantityButton: {
    width: 36,
    height: 36,
    border: "none",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
    padding: 0,
  },
  quantityButtonMobile: {
    width: 38,
    height: 38,
    fontSize: 17,
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
    bottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
    transform: "translateX(-50%)",
    zIndex: 25,
    width: "min(360px, calc(100% - 32px))",
    border: "none",
    borderRadius: 999,
    background: colors.dark,
    color: colors.surface,
    padding: "13px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.24)",
  },
  floatingCartLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  cartOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "flex-end",
  },
  cartOverlayMobile: {
    justifyContent: "stretch",
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
  cartPanelMobile: {
    width: "100%",
    maxWidth: "100%",
    boxShadow: "none",
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
    background: colors.bg,
    borderRadius: 999,
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: colors.text,
  },
  cartList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px",
  },
  emptyCartWrap: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    textAlign: "center",
    padding: "24px 16px",
  },
  emptyCart: {
    color: colors.textSubtle,
    fontWeight: 700,
  },
  emptyCartButton: {
    border: "none",
    background: colors.dark,
    color: colors.surface,
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 800,
    cursor: "pointer",
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
    gap: 12,
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
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    position: "sticky",
    bottom: 0,
    padding: "16px 20px calc(16px + env(safe-area-inset-bottom, 0px))",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffdf8",
    boxShadow: "0 -12px 28px rgba(28, 26, 23, 0.08)",
  },
  cartFooterTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    fontSize: 15,
    color: "#625b53",
  },
  checkoutButton: {
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "16px 18px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 16,
    boxShadow: "0 14px 28px rgba(159, 29, 47, 0.22)",
  },
  checkoutButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  checkoutButtonMobile: {
    fontSize: 15,
    padding: "15px 14px",
  },
  cartClosedNote: {
    marginTop: 10,
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.4,
    textAlign: "center",
  },
  emptySearch: {
    borderRadius: 8,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    padding: 24,
    color: "#625b53",
  },
};
