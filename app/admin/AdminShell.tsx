"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "../../lib/useMediaQuery";

const navItems = [
  { href: "/admin/menu", label: "Cardápio" },
  { href: "/admin/faturamento", label: "Faturamento" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/promocoes", label: "Promoções" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

const extraNavItems = [{ href: "/cozinha", label: "Cozinha" }];

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

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

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
  const isMobile = useMediaQuery("(max-width: 760px)");
  const isTablet = useMediaQuery("(max-width: 1040px)");

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <main style={{ ...styles.page, ...(isTablet ? styles.pageStack : {}) }}>
      <aside style={{ ...styles.sidebar, ...(isTablet ? styles.sidebarTop : {}), ...(isMobile ? styles.sidebarMobile : {}) }}>
        <div>
          <h2 style={{ ...styles.sidebarTitle, ...(isMobile ? styles.sidebarTitleMobile : {}) }}>Missô Admin</h2>
          <p style={{ ...styles.sidebarMuted, ...(isMobile ? styles.sidebarMutedMobile : {}) }}>Gestão operacional</p>
        </div>
        <nav style={{ ...styles.nav, ...(isTablet ? styles.navInline : {}), ...(isMobile ? styles.navMobileHidden : {}) }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(isMobile ? styles.navLinkMobile : {}),
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={styles.navDivider} />
          {extraNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(isMobile ? styles.navLinkMobile : {}),
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} style={{ ...styles.logoutButton, ...(isMobile ? styles.logoutButtonMobile : {}) }}>
            Sair
          </button>
        </nav>
        {isMobile && (
          <button type="button" onClick={handleLogout} style={styles.mobileLogoutButton}>
            Sair
          </button>
        )}
      </aside>

      <section style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
          <div>
            <p style={styles.eyebrow}>{eyebrow}</p>
            <h1 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>{title}</h1>
          </div>
          {action && <div style={{ ...(isMobile ? styles.headerActionMobile : {}) }}>{action}</div>}
        </header>
        {children}
      </section>
      {isMobile && (
        <nav style={styles.mobileTabBar} aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.mobileTab,
                ...(pathname === item.href ? styles.mobileTabActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
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
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
  },
  select: {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
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
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 16,
  },
  cardEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
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
      background: "#f7f4ef",
      color: "#1c1a17",
      display: "grid",
      gridTemplateColumns: "240px minmax(0, 1fr)",
    },
    pageStack: {
      gridTemplateColumns: "1fr",
    },
    sidebar: {
      borderRight: "1px solid rgba(28, 26, 23, 0.08)",
      background: "#fffdf8",
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
      borderRadius: 8,
      padding: "12px 14px",
      fontWeight: 850,
    },
    navLinkMobile: {
      flex: "0 0 auto",
      padding: "9px 11px",
      fontSize: 13,
      whiteSpace: "nowrap",
    },
    navLinkActive: {
      background: "#1c1a17",
      color: "#fffdf8",
    },
    navDivider: {
      height: 1,
      background: "rgba(28, 26, 23, 0.08)",
      margin: "4px 0",
    },
    logoutButton: {
      border: "1px solid rgba(28, 26, 23, 0.12)",
      borderRadius: 8,
      background: "#fffdf8",
      color: "#514a43",
      padding: "12px 14px",
      cursor: "pointer",
      fontWeight: 850,
      textAlign: "left",
    },
    logoutButtonMobile: {
      flex: "0 0 auto",
      padding: "9px 11px",
      fontSize: 13,
      whiteSpace: "nowrap",
    },
    mobileLogoutButton: {
      border: "1px solid rgba(28, 26, 23, 0.12)",
      borderRadius: 999,
      background: "#fffdf8",
      color: "#514a43",
      padding: "8px 12px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 850,
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
      bottom: 10,
      zIndex: 80,
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 4,
      border: "1px solid rgba(28, 26, 23, 0.1)",
      borderRadius: 18,
      background: "rgba(255, 253, 248, 0.96)",
      padding: 6,
      boxShadow: "0 18px 45px rgba(28, 26, 23, 0.18)",
      backdropFilter: "blur(14px)",
    },
    mobileTab: {
      minWidth: 0,
      borderRadius: 13,
      color: "#625b53",
      padding: "9px 5px",
      textAlign: "center",
      textDecoration: "none",
      fontSize: 11,
      fontWeight: 850,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    mobileTabActive: {
      background: "#1c1a17",
      color: "#fffdf8",
    },
  };
}

const styles = baseStyles();

