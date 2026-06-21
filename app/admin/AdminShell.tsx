"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChefHat,
  LogOut,
  Settings,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { formatBrasiliaDateTimeShort } from "../../lib/brasiliaTime";
import { useIsMobile, useIsTablet } from "../../lib/useMediaQuery";
import {
  getCardStyle,
  getInputStyle,
  getSelectStyle,
  eyebrowStyle,
} from "../../lib/uiStyles";
import { BrandLogo } from "../components/BrandLogo";
import { Button } from "../components/ui/Button";

const navItems: { href: string; label: string; shortLabel: string; Icon: LucideIcon }[] = [
  { href: "/admin/menu", label: "Cardápio", shortLabel: "Menu", Icon: UtensilsCrossed },
  { href: "/admin/faturamento", label: "Faturamento", shortLabel: "Fat.", Icon: BarChart3 },
  { href: "/admin/promocoes", label: "Promoções", shortLabel: "Promo", Icon: Tag },
  { href: "/admin/configuracoes", label: "Configurações", shortLabel: "Config", Icon: Settings },
];

const extraNavItems = [
  { href: "/cozinha", label: "Cozinha", shortLabel: "Coz.", Icon: ChefHat },
];

export const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const number = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const formatDateTime = (value: string) => formatBrasiliaDateTimeShort(value);

export type AdminOrderItem = {
  id: number;
  name: string;
  price: number;
  quantity?: number;
  modifiers?: string[] | null;
};

export type AdminOrder = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  items?: AdminOrderItem[] | null;
  note?: string | null;
  total?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  loyalty_discount?: number | null;
  coupon_code?: string | null;
  status?: string | null;
  created_at: string;
  payment_method?: string | null;
  payment_status?: string | null;
  fulfillment?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
  addons?: { id: string; name: string; quantity: number; unit_price?: number | null }[] | null;
  service_fee?: number | null;
  service_fee_label?: string | null;
};

export const calcTotal = (order: AdminOrder) =>
  typeof order.total === "number"
    ? order.total
    : (order.items || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * (item.quantity ?? 1),
        0
      );

export function AdminShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const isNavActive = (href: string) => {
    if (href === "/admin/faturamento") {
      return (
        pathname === "/admin" ||
        pathname.startsWith("/admin/faturamento") ||
        pathname.startsWith("/admin/pedidos") ||
        pathname.startsWith("/admin/clientes") ||
        pathname.startsWith("/admin/pagamentos")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <main style={{ ...styles.page, ...(isTablet ? styles.pageStack : {}) }}>
      <aside style={{ ...styles.sidebar, ...(isTablet ? styles.sidebarTop : {}), ...(isMobile ? styles.sidebarMobile : {}) }}>
        <div>
          <BrandLogo size="sm" />
          <p style={{ ...styles.sidebarMuted, ...(isMobile ? styles.sidebarMutedMobile : {}) }}>Gestão operacional</p>
        </div>
        <nav style={{ ...styles.nav, ...(isTablet ? styles.navInline : {}), ...(isMobile ? styles.navMobileHidden : {}) }}>
          {navItems.map((item) => {
            const { Icon } = item;
            return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(isMobile ? styles.navLinkMobile : {}),
                ...(isNavActive(item.href) ? styles.navLinkActive : {}),
              }}
            >
              <Icon size={16} strokeWidth={2.2} />
              {item.label}
            </Link>
            );
          })}
          <div style={styles.navDivider} />
          {extraNavItems.map((item) => {
            const { Icon } = item;
            return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(isMobile ? styles.navLinkMobile : {}),
                ...(isNavActive(item.href) ? styles.navLinkActive : {}),
              }}
            >
              <Icon size={16} strokeWidth={2.2} />
              {item.label}
            </Link>
            );
          })}
          <Button type="button" variant="ghost" size="sm" onClick={handleLogout} style={styles.logoutButton}>
            <LogOut size={15} strokeWidth={2.2} />
            Sair
          </Button>
        </nav>
        {isMobile && (
          <Button type="button" variant="ghost" size="sm" onClick={handleLogout} style={styles.mobileLogoutButton}>
            <LogOut size={14} strokeWidth={2.2} />
            Sair
          </Button>
        )}
      </aside>

      <section style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
          <div>
            <p style={eyebrowStyle}>{eyebrow}</p>
            <h1 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>{title}</h1>
          </div>
          {action && <div style={{ ...(isMobile ? styles.headerActionMobile : {}) }}>{action}</div>}
        </header>
        {children}
      </section>
      {isMobile && (
        <nav style={styles.mobileTabBar} aria-label="Navegação principal">
          {[...navItems, ...extraNavItems].map((item) => {
            const { Icon } = item;
            return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.mobileTab,
                ...(isNavActive(item.href) ? styles.mobileTabActive : {}),
              }}
            >
              <Icon size={15} strokeWidth={2.2} />
              <span>{item.shortLabel}</span>
            </Link>
            );
          })}
        </nav>
      )}
    </main>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p style={styles.muted}>{text}</p>;
}

export const adminStyles: Record<string, CSSProperties> = {
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 260px)",
    gap: 10,
    marginBottom: 14,
  },
  toolbarStack: {
    gridTemplateColumns: "1fr",
  },
  input: {
    ...getInputStyle(),
    boxSizing: "border-box",
    minWidth: 0,
    background: "var(--color-surface)",
  },
  select: {
    ...getSelectStyle(),
    boxSizing: "border-box",
    minWidth: 0,
    background: "var(--color-surface)",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    ...getCardStyle(),
    minHeight: 126,
    display: "grid",
    alignContent: "space-between",
  },
  metricLabel: {
    color: "#625b53",
    fontSize: 13,
    fontWeight: 850,
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    lineHeight: 1.05,
  },
  metricDetail: {
    marginTop: 10,
    color: "#766e64",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
    gap: 16,
    alignItems: "start",
  },
  gridStack: {
    gridTemplateColumns: "1fr",
  },
  card: {
    ...getCardStyle(),
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 16,
  },
  cardEyebrow: eyebrowStyle,
  cardTitle: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  pill: {
    borderRadius: 999,
    background: "#f0ebe2",
    padding: "7px 10px",
    color: "#625b53",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  muted: {
    color: "#625b53",
    lineHeight: 1.5,
  },
  mutedSmall: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.35,
  },
  primaryLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "12px 16px",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  secondaryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
};

function baseStyles(): Record<string, CSSProperties> {
  return {
    page: {
      minHeight: "100vh",
      background: "var(--color-bg)",
      color: "var(--color-text)",
      display: "grid",
      gridTemplateColumns: "240px minmax(0, 1fr)",
    },
    pageStack: {
      gridTemplateColumns: "1fr",
    },
    sidebar: {
      borderRight: "1px solid rgba(28, 26, 23, 0.08)",
      background: "var(--color-surface)",
      padding: 22,
      display: "flex",
      flexDirection: "column",
      gap: 28,
    },
    sidebarTop: {
      borderRight: "none",
      borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
      gap: 14,
    },
    sidebarMobile: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      padding: "12px 14px",
      gap: 10,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 10px 26px rgba(28, 26, 23, 0.08)",
    },
    sidebarTitle: {
      fontSize: 20,
      lineHeight: 1.1,
    },
    sidebarTitleMobile: {
      fontSize: 16,
    },
    sidebarMuted: {
      marginTop: 5,
      color: "#766e64",
      fontSize: 13,
    },
    sidebarMutedMobile: {
      display: "none",
    },
    nav: {
      display: "grid",
      gap: 8,
    },
    navInline: {
      display: "flex",
      flexWrap: "wrap",
    },
    navMobileHidden: {
      display: "none",
    },
    navLink: {
      color: "#514a43",
      textDecoration: "none",
      borderRadius: 10,
      padding: "12px 14px",
      fontWeight: 850,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
    },
    navLinkMobile: {
      flex: "0 0 auto",
      padding: "9px 11px",
      fontSize: 13,
      whiteSpace: "nowrap",
    },
    navLinkActive: {
      background: "var(--color-dark)",
      color: "var(--color-surface)",
    },
    navDivider: {
      height: 1,
      background: "rgba(28, 26, 23, 0.08)",
      margin: "4px 0",
    },
    logoutButton: {
      justifyContent: "flex-start",
      width: "100%",
      marginTop: 4,
    },
    logoutButtonMobile: {
      flex: "0 0 auto",
    },
    mobileLogoutButton: {
      whiteSpace: "nowrap",
    },
    content: {
      padding: "28px 24px 56px",
      minWidth: 0,
    },
    contentMobile: {
      padding: "16px 10px 96px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      alignItems: "end",
      marginBottom: 18,
    },
    headerMobile: {
      display: "grid",
      alignItems: "start",
      gap: 8,
      marginBottom: 12,
    },
    headerActionMobile: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      overflowX: "auto",
    },
    eyebrow: {
      color: "#9f1d2f",
      fontSize: 12,
      fontWeight: 850,
      textTransform: "uppercase",
    },
    title: {
      marginTop: 4,
      fontSize: "clamp(36px, 5vw, 58px)",
      lineHeight: 1,
      fontFamily: "var(--font-dm-serif), Georgia, serif",
    },
    titleMobile: {
      fontSize: 30,
    },
    muted: {
      color: "#625b53",
      lineHeight: 1.5,
    },
    mobileTabBar: {
      position: "fixed",
      left: 10,
      right: 10,
      bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
      zIndex: 80,
      display: "flex",
      gap: 4,
      overflowX: "auto",
      border: "1px solid rgba(28, 26, 23, 0.1)",
      borderRadius: 18,
      background: "rgba(255, 253, 248, 0.96)",
      padding: 6,
      boxShadow: "0 18px 45px rgba(28, 26, 23, 0.18)",
      backdropFilter: "blur(14px)",
      WebkitOverflowScrolling: "touch",
    },
    mobileTab: {
      flex: "0 0 auto",
      minWidth: 68,
      borderRadius: 13,
      color: "#625b53",
      padding: "8px 5px",
      textAlign: "center",
      textDecoration: "none",
      fontSize: 10,
      fontWeight: 850,
      whiteSpace: "nowrap",
      display: "grid",
      justifyItems: "center",
      gap: 3,
    },
    mobileTabActive: {
      background: "var(--color-dark)",
      color: "var(--color-surface)",
    },
  };
}

const styles = baseStyles();

