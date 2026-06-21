"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminOrderItemsList } from "../../components/AdminOrderItemsList";
import { downloadOrdersCsv } from "../../../lib/exportOrdersCsv";
import { formatPickupTime } from "../../../lib/orderFeatures";
import { getCustomerWhatsAppUrl } from "../../../lib/adminOrderDetails";
import { supabase } from "../../../lib/supabase";
import {
  addDaysInBrasilia,
  formatBrasiliaDateTimeShort,
  toBrasiliaDateKey,
} from "../../../lib/brasiliaTime";
import { useIsMobile, useIsTablet } from "../../../lib/useMediaQuery";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  money,
  normalize,
  number,
  type AdminOrder,
} from "../AdminShell";

type DateRange = "today" | "7d" | "30d" | "all" | "custom";

const dateRangeLabels: Record<DateRange, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Tudo",
  custom: "Período",
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

const getDateRangeStart = (range: DateRange) => {
  if (range === "all" || range === "custom") return "";

  if (range === "7d") return toBrasiliaDateKey(addDaysInBrasilia(new Date(), -6));
  if (range === "30d") return toBrasiliaDateKey(addDaysInBrasilia(new Date(), -29));
  return toBrasiliaDateKey(new Date());
};

const getShortPickupLabel = (order: AdminOrder) => {
  if (order.fulfillment_type === "scheduled" && order.scheduled_for) {
    return formatPickupTime(order.scheduled_for);
  }
  return "Padrão";
};

const isPaidOrder = (order: AdminOrder) => order.payment_status === "pago";

type OrderDateGroup = {
  dateKey: string;
  label: string;
  orders: AdminOrder[];
};

const formatOrderDateGroupLabel = (createdAt: string) => {
  const orderKey = toBrasiliaDateKey(createdAt);
  const todayKey = toBrasiliaDateKey(new Date());
  const yesterdayKey = toBrasiliaDateKey(addDaysInBrasilia(new Date(), -1));

  if (orderKey === todayKey) return "Hoje";
  if (orderKey === yesterdayKey) return "Ontem";

  const [year, month, day] = orderKey.split("-");
  const currentYear = todayKey.split("-")[0];
  return year === currentYear ? `${day}/${month}` : `${day}/${month}/${year}`;
};

const groupOrdersByDate = (orders: AdminOrder[]): OrderDateGroup[] => {
  const groups: OrderDateGroup[] = [];

  orders.forEach((order) => {
    const dateKey = toBrasiliaDateKey(order.created_at);
    const label = formatOrderDateGroupLabel(order.created_at);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dateKey === dateKey) {
      lastGroup.orders.push(order);
      return;
    }

    groups.push({ dateKey, label, orders: [order] });
  });

  return groups;
};

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");

const matchesOrderSearch = (order: AdminOrder, search: string) => {
  const trimmed = search.trim();
  if (!trimmed) return true;

  const query = normalize(trimmed);
  const queryDigits = normalizePhoneDigits(trimmed);
  const orderPhoneDigits = normalizePhoneDigits(order.phone || "");

  return (
    normalize(String(order.id)).includes(query) ||
    normalize(order.name || "").includes(query) ||
    normalize(order.phone || "").includes(query) ||
    (queryDigits.length >= 8 && orderPhoneDigits.includes(queryDigits))
  );
};

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <AdminShell eyebrow="Atendimento" title="Pedidos">
          <p style={localStyles.muted}>Carregando pedidos...</p>
        </AdminShell>
      }
    >
      <AdminOrdersPageContent />
    </Suspense>
  );
}

function AdminOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const activeCustomerFilter = searchParams.get("cliente")?.trim() || "";

  useEffect(() => {
    const cliente = searchParams.get("cliente");
    if (cliente === null) return;

    setSearch(cliente);
    if (cliente.trim()) {
      setDateRange("all");
    }
  }, [searchParams]);

  const applyCustomerFilter = (phone: string) => {
    const value = phone.trim();
    if (!value) return;

    setSearch(value);
    setDateRange("all");
    router.push(`/admin/pedidos?cliente=${encodeURIComponent(value)}`);
  };

  const clearCustomerFilter = () => {
    setSearch("");
    router.push("/admin/pedidos");
  };

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "pago")
        .order("created_at", { ascending: false });

      if (mounted) {
        setOrders(
          (data || [])
            .filter((order) => isPaidOrder(order as AdminOrder))
            .map((order) => ({
              ...(order as AdminOrder),
              items: Array.isArray((order as AdminOrder).items)
                ? (order as AdminOrder).items
                : [],
            }))
        );
        setLoading(false);
      }
    }

    fetchOrders();

    const normalizeOrder = (raw: AdminOrder): AdminOrder => ({
      ...(raw as AdminOrder),
      items: Array.isArray((raw as AdminOrder).items) ? (raw as AdminOrder).items : [],
    });

    const channel = supabase
      .channel("admin-orders-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = normalizeOrder(payload.new as AdminOrder);
        if (!isPaidOrder(order)) return;
        setOrders((prev) => [order, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const order = normalizeOrder(payload.new as AdminOrder);
        setOrders((prev) => {
          if (!isPaidOrder(order)) {
            return prev.filter((current) => current.id !== order.id);
          }

          const exists = prev.some((current) => current.id === order.id);
          return exists
            ? prev.map((current) => (current.id === order.id ? order : current))
            : [order, ...prev];
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const rangeStart = dateRange === "custom" ? dateFrom : getDateRangeStart(dateRange);
    const rangeEnd = dateRange === "custom" ? dateTo : "";

    return orders.filter((order) => {
      if (!isPaidOrder(order)) return false;

      const orderDate = toBrasiliaDateKey(order.created_at);
      const byDateStart = !rangeStart || orderDate >= rangeStart;
      const byDateEnd = !rangeEnd || orderDate <= rangeEnd;

      return byDateStart && byDateEnd && matchesOrderSearch(order, search);
    });
  }, [dateFrom, dateRange, dateTo, orders, search]);

  const summary = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => sum + calcTotal(order), 0);
    const average = filteredOrders.length > 0 ? total / filteredOrders.length : 0;

    return { average, total };
  }, [filteredOrders]);

  const groupedOrders = useMemo(() => groupOrdersByDate(filteredOrders), [filteredOrders]);

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) return;

    downloadOrdersCsv(filteredOrders, {
      dateRange,
      dateFrom,
      dateTo,
    });
  };

  return (
    <AdminShell
      eyebrow="Atendimento"
      title="Pedidos"
      action={
        <span style={styles.pill}>
          {loading ? "Carregando" : `${number(filteredOrders.length)} pedidos`}
        </span>
      }
    >
      <section style={{ ...localStyles.summaryStrip, ...(isMobile ? localStyles.summaryStripMobile : {}) }}>
        <div style={localStyles.summaryItem}>
          <span>Total no filtro</span>
          <strong>{money(summary.total)}</strong>
        </div>
        <div style={localStyles.summaryItem}>
          <span>Pedidos</span>
          <strong>{number(filteredOrders.length)}</strong>
        </div>
        <div style={localStyles.summaryItem}>
          <span>Ticket médio</span>
          <strong>{money(summary.average)}</strong>
        </div>
      </section>

      <section style={{ ...localStyles.panel, ...(isMobile ? localStyles.panelMobile : {}) }}>
        <div
          style={{
            ...localStyles.panelHeader,
            ...(isMobile ? localStyles.panelHeaderMobile : {}),
          }}
        >
          <div>
            <p style={styles.cardEyebrow}>Histórico</p>
            <h2 style={styles.cardTitle}>Lista de pedidos</h2>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredOrders.length === 0}
            style={{
              ...localStyles.exportButton,
              ...(loading || filteredOrders.length === 0 ? localStyles.exportButtonDisabled : {}),
              ...(isMobile ? localStyles.exportButtonMobile : {}),
            }}
          >
            Exportar CSV
          </button>
        </div>

        <div
          style={{
            ...localStyles.toolbar,
            ...(dateRange === "custom" ? localStyles.toolbarCustom : {}),
            ...(isTablet ? localStyles.toolbarStack : {}),
          }}
        >
          <label style={localStyles.periodField}>
            <span style={localStyles.fieldLabel}>Período</span>
            <div style={{ ...localStyles.segmented, ...(isMobile ? localStyles.segmentedMobile : {}) }}>
              {(Object.keys(dateRangeLabels) as DateRange[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDateRange(option)}
                  style={{
                    ...localStyles.segmentButton,
                    ...(dateRange === option ? localStyles.segmentButtonActive : {}),
                  }}
                >
                  {dateRangeLabels[option]}
                </button>
              ))}
            </div>
          </label>
          {dateRange === "custom" && (
            <>
              <label style={localStyles.dateField}>
                <span style={localStyles.fieldLabel}>Início</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  style={localStyles.control}
                  aria-label="Data inicial"
                />
              </label>
              <label style={localStyles.dateField}>
                <span style={localStyles.fieldLabel}>Fim</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  style={localStyles.control}
                  aria-label="Data final"
                />
              </label>
            </>
          )}
          <label style={localStyles.searchField}>
            <span style={localStyles.fieldLabel}>Busca</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pedido, cliente ou telefone"
              style={localStyles.control}
            />
          </label>
        </div>

        {activeCustomerFilter && (
          <div style={localStyles.customerFilterBar}>
            <span style={localStyles.customerFilterText}>
              Filtrando cliente: <strong>{activeCustomerFilter}</strong>
            </span>
            <button type="button" onClick={clearCustomerFilter} style={localStyles.customerFilterClear}>
              Limpar
            </button>
          </div>
        )}

        <div style={localStyles.list}>
          {groupedOrders.map((group) => (
            <section key={group.dateKey} style={localStyles.dateGroup}>
              <div style={localStyles.dateGroupHeader}>{group.label}</div>

              {group.orders.map((order) => {
                const hasNote = Boolean(order.note?.trim());
                const hasCoupon =
                  Boolean(order.coupon_code?.trim()) || Number(order.discount_amount || 0) > 0;
                const couponTitle = order.coupon_code?.trim()
                  ? `Cupom ${order.coupon_code.trim()}`
                  : "Cupom aplicado";
                const paymentLabel =
                  paymentLabels[order.payment_method || ""] || order.payment_method || "—";
                const whatsappUrl = getCustomerWhatsAppUrl(order.phone);
                const customerPhone = order.phone?.trim() || "";

                return (
                  <article key={order.id} style={localStyles.orderBlock}>
                    <div
                      style={{
                        ...localStyles.orderHeader,
                        ...(isMobile ? localStyles.orderHeaderMobile : {}),
                      }}
                    >
                      <div
                        style={{
                          ...localStyles.orderHeaderLine,
                          ...(isMobile ? localStyles.orderHeaderLineMobile : {}),
                        }}
                      >
                        <div style={localStyles.orderHeaderIdentity}>
                          <strong style={localStyles.orderId}>#{order.id}</strong>
                          <span style={localStyles.orderSeparator}>·</span>
                          <span style={localStyles.orderName}>{order.name || "Cliente"}</span>
                          <span style={localStyles.orderSeparator}>·</span>
                          <span style={localStyles.orderPhone}>
                            {order.phone || "Sem telefone"}
                          </span>
                          {!isMobile && (
                            <>
                              <span style={localStyles.orderSeparator}>·</span>
                              <span style={localStyles.orderTime}>
                                {formatBrasiliaDateTimeShort(order.created_at)}
                              </span>
                            </>
                          )}
                          {(hasNote || hasCoupon) && (
                            <span style={localStyles.rowIndicators}>
                              {hasNote && (
                                <span
                                  style={localStyles.indicatorNote}
                                  title="Tem observação do cliente"
                                  aria-label="Tem observação do cliente"
                                >
                                  Obs
                                </span>
                              )}
                              {hasCoupon && (
                                <span
                                  style={localStyles.indicatorCoupon}
                                  title={couponTitle}
                                  aria-label={couponTitle}
                                >
                                  Cupom
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <strong style={localStyles.rowTotal}>{money(calcTotal(order))}</strong>
                      </div>

                      <div
                        style={{
                          ...localStyles.orderHeaderSubline,
                          ...(isMobile ? localStyles.orderHeaderSublineMobile : {}),
                        }}
                      >
                        <div style={localStyles.orderHeaderMeta}>
                          {isMobile && (
                            <>
                              <span>{formatBrasiliaDateTimeShort(order.created_at)}</span>
                              <span style={localStyles.orderSeparator}>·</span>
                            </>
                          )}
                          <span>{getShortPickupLabel(order)}</span>
                          <span style={localStyles.orderSeparator}>·</span>
                          <span>{paymentLabel}</span>
                        </div>

                        {(whatsappUrl || customerPhone) && (
                          <div style={localStyles.orderHeaderActions}>
                            {whatsappUrl ? (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={localStyles.actionLink}
                              >
                                WhatsApp
                              </a>
                            ) : null}
                            {customerPhone ? (
                              <button
                                type="button"
                                onClick={() => applyCustomerFilter(customerPhone)}
                                style={localStyles.actionLink}
                              >
                                {isMobile ? "Pedidos do cliente" : "Histórico do cliente"}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {hasNote && (
                        <p style={localStyles.orderNote}>{order.note?.trim()}</p>
                      )}
                    </div>

                    <AdminOrderItemsList items={order.items} addons={order.addons} />
                  </article>
                );
              })}
            </section>
          ))}

          {loading && <p style={localStyles.muted}>Carregando pedidos...</p>}
          {!loading && filteredOrders.length === 0 && (
            <EmptyState text="Nenhum pedido encontrado para os filtros atuais." />
          )}
        </div>
      </section>
    </AdminShell>
  );
}

const localStyles: Record<string, CSSProperties> = {
  summaryStrip: {
    display: "flex",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  summaryStripMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  summaryItem: {
    flex: "1 1 160px",
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: "14px 16px",
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  panel: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: "18px 20px 10px",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.04)",
  },
  panelMobile: {
    padding: "14px 12px 8px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  panelHeaderMobile: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  exportButton: {
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    background: "#fff",
    color: "#1c1a17",
    padding: "11px 14px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    whiteSpace: "nowrap",
    minHeight: 46,
  },
  exportButtonMobile: {
    width: "100%",
  },
  exportButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1.2fr) minmax(220px, 1fr)",
    gap: 10,
    marginBottom: 16,
    alignItems: "end",
  },
  toolbarCustom: {
    gridTemplateColumns: "minmax(280px, 1.2fr) minmax(130px, 0.7fr) minmax(130px, 0.7fr) minmax(220px, 1fr)",
  },
  toolbarStack: {
    gridTemplateColumns: "1fr",
  },
  periodField: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  searchField: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  dateField: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  fieldLabel: {
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 4,
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 8,
    padding: 4,
    minHeight: 46,
  },
  segmentedMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  segmentButton: {
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#514a43",
    padding: "8px 6px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
  },
  segmentButtonActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  control: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: "12px 13px",
    background: "#fff",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
    minHeight: 46,
  },
  customerFilterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#f0ebe2",
    color: "#514a43",
    fontSize: 13,
    fontWeight: 750,
  },
  customerFilterText: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  customerFilterClear: {
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  list: {
    display: "grid",
    gap: 12,
  },
  dateGroup: {
    display: "grid",
    gap: 4,
  },
  dateGroupHeader: {
    padding: "2px 2px 4px",
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  orderBlock: {
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    overflow: "hidden",
  },
  orderHeader: {
    display: "grid",
    gap: 8,
    padding: "10px 14px",
    borderBottom: "1px solid rgba(28, 26, 23, 0.06)",
  },
  orderHeaderMobile: {
    gap: 6,
  },
  orderHeaderLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  orderHeaderLineMobile: {
    alignItems: "flex-start",
  },
  orderHeaderSubline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  orderHeaderSublineMobile: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 4,
  },
  orderHeaderIdentity: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    minWidth: 0,
    flex: "1 1 auto",
  },
  orderId: {
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1.2,
    color: "#1c1a17",
  },
  orderName: {
    fontSize: 14,
    fontWeight: 800,
    color: "#1c1a17",
    lineHeight: 1.2,
  },
  orderPhone: {
    fontSize: 13,
    fontWeight: 700,
    color: "#514a43",
    lineHeight: 1.2,
  },
  orderTime: {
    fontSize: 12,
    fontWeight: 700,
    color: "#766e64",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  orderSeparator: {
    color: "#c7bfb3",
    fontSize: 12,
    lineHeight: 1,
  },
  orderHeaderActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    flexShrink: 0,
  },
  orderHeaderMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
    minWidth: 0,
  },
  orderNote: {
    margin: 0,
    padding: "8px 10px",
    borderLeft: "3px solid #9f1d2f",
    background: "#fff7f7",
    color: "#514a43",
    fontSize: 12,
    lineHeight: 1.45,
  },
  rowIndicators: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  indicatorNote: {
    borderRadius: 999,
    background: "#fff1f1",
    color: "#9f1d2f",
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    lineHeight: 1.4,
  },
  indicatorCoupon: {
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#0f7a4a",
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    lineHeight: 1.4,
  },
  rowTotal: {
    fontSize: 14,
    fontWeight: 850,
    whiteSpace: "nowrap",
    flexShrink: 0,
    color: "#1c1a17",
  },
  actionLink: {
    border: "none",
    background: "transparent",
    color: "#766e64",
    padding: 0,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 12,
    textDecoration: "underline",
    textDecorationColor: "rgba(118, 110, 100, 0.35)",
    textUnderlineOffset: 2,
    display: "inline-flex",
    alignItems: "center",
    font: "inherit",
    whiteSpace: "nowrap",
  },
  muted: {
    color: "#766e64",
    padding: "12px 14px",
    fontSize: 14,
  },
};
