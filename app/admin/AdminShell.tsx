"use client";

import type { CSSProperties, ReactNode, SVGProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatBrasiliaDateTimeShort } from "../../lib/brasiliaTime";
import { useIsMobile, useIsTablet } from "../../lib/useMediaQuery";

const navItems = [
  { href: "/admin/menu", label: "Cardápio", shortLabel: "Cardápio" },
  { href: "/admin/faturamento", label: "Faturamento", shortLabel: "Vendas" },
  { href: "/admin/pedidos", label: "Pedidos", shortLabel: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes", shortLabel: "Clientes" },
  { href: "/admin/promocoes", label: "Promoções", shortLabel: "Promoções" },
  { href: "/admin/configuracoes", label: "Configurações", shortLabel: "Config." },
];

const extraNavItems = [{ href: "/cozinha", label: "Cozinha", shortLabel: "Cozinha" }];

const mobilePrimaryTabs = [
  { href: "/admin/menu", label: "Cardápio", icon: IconMenu },
  { href: "/admin/pedidos", label: "Pedidos", icon: IconOrders },
  { href: "/admin/faturamento", label: "Vendas", icon: IconChart },
  { href: "/admin/clientes", label: "Clientes", icon: IconUsers },
] as const;

const mobileMoreItems = [
  { href: "/admin/promocoes", label: "Promoções", icon: IconTag },
  { href: "/admin/configuracoes", label: "Configurações", icon: IconSettings },
  { href: "/cozinha", label: "Cozinha", icon: IconKitchen },
] as const;

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
  const [moreOpen, setMoreOpen] = useState(false);

  const morePaths = [
    "/admin/promocoes",
    "/admin/configuracoes",
    "/cozinha",
  ];
  const isMoreActive = morePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (isMobile) {
    return (
      <div className="admin-app-shell">
        <header style={styles.mobileAppBar}>
          <div style={styles.mobileAppBarMain}>
            <span style={styles.mobileBrand}>Missô</span>
            <h1 style={styles.mobileTitle}>{title}</h1>
            {eyebrow ? <p style={styles.mobileEyebrow}>{eyebrow}</p> : null}
          </div>
        </header>

        {action ? <div style={styles.mobileActionRow}>{action}</div> : null}

        <section className="admin-app-content" style={styles.contentMobile}>
          {children}
        </section>

        {moreOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            style={styles.mobileSheetBackdrop}
            onClick={() => setMoreOpen(false)}
          />
        )}

        {moreOpen && (
          <div style={styles.mobileSheet} role="dialog" aria-label="Mais opções">
            <div style={styles.mobileSheetHandle} aria-hidden="true" />
            <p style={styles.mobileSheetTitle}>Mais opções</p>
            <div style={styles.mobileSheetLinks}>
              {mobileMoreItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      ...styles.mobileSheetLink,
                      ...(active ? styles.mobileSheetLinkActive : {}),
                    }}
                  >
                    <span style={styles.mobileSheetIcon}>
                      <Icon size={20} active={active} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button type="button" onClick={handleLogout} style={styles.mobileSheetLogout}>
                <IconLogout size={20} />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        )}

        <nav style={styles.mobileTabBar} aria-label="Navegação principal">
          {mobilePrimaryTabs.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.mobileTab,
                  ...(active ? styles.mobileTabActive : {}),
                }}
              >
                <Icon size={22} active={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            style={{
              ...styles.mobileTab,
              ...(isMoreActive || moreOpen ? styles.mobileTabActive : {}),
            }}
            aria-expanded={moreOpen}
            aria-label="Mais opções"
          >
            <IconMore size={22} active={isMoreActive || moreOpen} />
            <span>Mais</span>
          </button>
        </nav>
      </div>
    );
  }

  return (
    <main style={{ ...styles.page, ...(isTablet ? styles.pageStack : {}) }}>
      <aside style={{ ...styles.sidebar, ...(isTablet ? styles.sidebarTop : {}) }}>
        <div>
          <h2 style={styles.sidebarTitle}>Missô Admin</h2>
          <p style={styles.sidebarMuted}>Gestão operacional</p>
        </div>
        <nav style={{ ...styles.nav, ...(isTablet ? styles.navInline : {}) }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
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
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} style={styles.logoutButton}>
            Sair
          </button>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={{ ...styles.header, ...(isTablet ? styles.headerTablet : {}) }}>
          <div>
            <p style={styles.eyebrow}>{eyebrow}</p>
            <h1 style={{ ...styles.title, ...(isTablet ? styles.titleTablet : {}) }}>{title}</h1>
          </div>
          {action}
        </header>
        {children}
      </section>
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
    borderRadius: 12,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
    minHeight: 48,
    fontSize: 16,
  },
  select: {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 12,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
    minHeight: 48,
    fontSize: 16,
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
    borderRadius: 14,
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
    borderRadius: 14,
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
    borderRadius: 12,
    background: "#9f1d2f",
    color: "#fff",
    padding: "14px 16px",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
    minHeight: 48,
    fontSize: 15,
  },
  secondaryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 12,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
    minHeight: 48,
    fontSize: 15,
  },
};

type IconProps = SVGProps<SVGSVGElement> & { size?: number; active?: boolean };

function iconColor(active?: boolean) {
  return active ? "#fffdf8" : "#625b53";
}

function IconMenu({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconOrders({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M7 4h10l1 3H6l1-3Z" stroke={iconColor(active)} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 7l1 13h10l1-13" stroke={iconColor(active)} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconChart({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5 19V9M12 19V5M19 19v-7" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="9" cy="8" r="3" stroke={iconColor(active)} strokeWidth="2" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 11h5M18.5 8.5v5" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMore({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="6" cy="12" r="1.6" fill={iconColor(active)} />
      <circle cx="12" cy="12" r="1.6" fill={iconColor(active)} />
      <circle cx="18" cy="12" r="1.6" fill={iconColor(active)} />
    </svg>
  );
}

function IconTag({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M20 12 12 20l-8-8V4h8l8 8Z" stroke={iconColor(active)} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={iconColor(active)} />
    </svg>
  );
}

function IconSettings({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3" stroke={iconColor(active)} strokeWidth="2" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
        stroke={iconColor(active)}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconKitchen({ size = 24, active, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10h16v10H4z" stroke={iconColor(active)} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 10V6a2 2 0 0 1 4 0v4M16 10V7a2 2 0 0 1 4 0v3" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" stroke="#9f1d2f" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 12H8M18 8l4 4-4 4" stroke="#9f1d2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles: Record<string, CSSProperties> = {
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
  sidebarTitle: {
    fontSize: 20,
    lineHeight: 1.1,
  },
  sidebarMuted: {
    marginTop: 5,
    color: "#766e64",
    fontSize: 13,
  },
  nav: {
    display: "grid",
    gap: 8,
  },
  navInline: {
    display: "flex",
    flexWrap: "wrap",
  },
  navLink: {
    color: "#514a43",
    textDecoration: "none",
    borderRadius: 8,
    padding: "12px 14px",
    fontWeight: 850,
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
  content: {
    padding: "28px 24px 56px",
    minWidth: 0,
  },
  contentMobile: {
    padding: "12px 12px calc(88px + env(safe-area-inset-bottom, 0px))",
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
    marginBottom: 18,
  },
  headerTablet: {
    display: "grid",
    alignItems: "start",
    gap: 8,
    marginBottom: 12,
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
  titleTablet: {
    fontSize: 34,
  },
  muted: {
    color: "#625b53",
    lineHeight: 1.5,
  },
  mobileAppBar: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px",
    background: "rgba(255, 253, 248, 0.94)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(12px)",
  },
  mobileAppBarMain: {
    minWidth: 0,
    flex: 1,
  },
  mobileBrand: {
    display: "block",
    color: "#9f1d2f",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  mobileTitle: {
    margin: "2px 0 0",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 900,
  },
  mobileEyebrow: {
    margin: "4px 0 0",
    color: "#766e64",
    fontSize: 12,
    fontWeight: 700,
  },
  mobileActionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "0 12px 10px",
    background: "rgba(255, 253, 248, 0.94)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.06)",
  },
  mobileTabBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 2,
    borderTop: "1px solid rgba(28, 26, 23, 0.1)",
    background: "rgba(255, 253, 248, 0.98)",
    padding: "6px 4px calc(6px + env(safe-area-inset-bottom, 0px))",
    boxShadow: "0 -10px 30px rgba(28, 26, 23, 0.08)",
    backdropFilter: "blur(14px)",
  },
  mobileTab: {
    border: "none",
    background: "transparent",
    borderRadius: 12,
    color: "#625b53",
    padding: "6px 2px",
    textAlign: "center",
    textDecoration: "none",
    fontSize: 10,
    fontWeight: 850,
    display: "grid",
    gap: 2,
    justifyItems: "center",
    alignContent: "center",
    minHeight: 52,
    cursor: "pointer",
    font: "inherit",
  },
  mobileTabActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  mobileSheetBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    border: "none",
    background: "rgba(28, 26, 23, 0.42)",
    cursor: "pointer",
  },
  mobileSheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    background: "#fffdf8",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: "10px 14px calc(18px + 72px + env(safe-area-inset-bottom, 0px))",
    boxShadow: "0 -18px 45px rgba(28, 26, 23, 0.18)",
  },
  mobileSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    background: "rgba(28, 26, 23, 0.14)",
    margin: "0 auto 12px",
  },
  mobileSheetTitle: {
    margin: "0 0 10px",
    color: "#766e64",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  mobileSheetLinks: {
    display: "grid",
    gap: 6,
  },
  mobileSheetLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: "14px 12px",
    textDecoration: "none",
    color: "#1c1a17",
    fontWeight: 800,
    fontSize: 15,
    background: "#f7f4ef",
  },
  mobileSheetIcon: {
    display: "inline-flex",
    width: 24,
    justifyContent: "center",
  },
  mobileSheetLinkActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  mobileSheetLogout: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "none",
    borderRadius: 12,
    padding: "14px 12px",
    background: "#fff1f1",
    color: "#9f1d2f",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    width: "100%",
  },
};
