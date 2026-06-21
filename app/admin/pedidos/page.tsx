"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { printOrder } from "../../../lib/printOrder";
import { formatAddonSummary, formatPickupTime } from "../../../lib/orderFeatures";
import { formatOrderItemLabel } from "../../../lib/itemModifiers";
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);
  const [search, setSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("cliente") || ""
  );
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

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
    const query = normalize(search.trim());
    const rangeStart = dateRange === "custom" ? dateFrom : getDateRangeStart(dateRange);
    const rangeEnd = dateRange === "custom" ? dateTo : "";

    return orders.filter((order) => {
      if (!isPaidOrder(order)) return false;

      const orderDate = toBrasiliaDateKey(order.created_at);
      const byDateStart = !rangeStart || orderDate >= rangeStart;
      const byDateEnd = !rangeEnd || orderDate <= rangeEnd;
      const bySearch =
        !query ||
        normalize(String(order.id)).includes(query) ||
        normalize(order.name || "").includes(query) ||
        normalize(order.phone || "").includes(query);

      return byDateStart && byDateEnd && bySearch;
    });
  }, [dateFrom, dateRange, dateTo, orders, search]);

  const summary = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => sum + calcTotal(order), 0);
    const average = filteredOrders.length > 0 ? total / filteredOrders.length : 0;

    return { average, total };
  }, [filteredOrders]);

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
        <div style={localStyles.panelHeader}>
          <div>
            <p style={styles.cardEyebrow}>Histórico</p>
            <h2 style={styles.cardTitle}>Lista de pedidos</h2>
          </div>
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

        {!isMobile && filteredOrders.length > 0 && (
          <div style={localStyles.tableHead}>
            <span>Pedido</span>
            <span style={localStyles.tableHeadCenter}>Retirada</span>
            <span style={localStyles.tableHeadCenter}>Pagamento</span>
            <span style={localStyles.tableHeadCenter}>Total</span>
            <span aria-hidden="true" />
          </div>
        )}

        <div style={localStyles.list}>
          {filteredOrders.map((order) => {
            const expanded = expandedOrderId === order.id;
            const addonSummary = formatAddonSummary(order.addons);
            const hasNote = Boolean(order.note?.trim());
            const paymentLabel = paymentLabels[order.payment_method || ""] || order.payment_method || "—";

            return (
              <article key={order.id} style={localStyles.orderBlock}>
                <div
                  style={{
                    ...localStyles.row,
                    ...(isMobile ? localStyles.rowMobile : {}),
                    ...(expanded ? { borderColor: "rgba(28, 26, 23, 0.14)" } : {}),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                    style={{
                      ...localStyles.rowMainButton,
                      ...(isMobile ? localStyles.rowMainButtonMobile : {}),
                    }}
                  >
                    <div style={localStyles.rowIdentity}>
                      <strong style={localStyles.rowTitle}>#{order.id}</strong>
                      <span style={localStyles.rowCustomer}>
                        {order.name || "Cliente"} · {order.phone || "Sem telefone"}
                      </span>
                      <span style={localStyles.rowMeta}>
                        {formatBrasiliaDateTimeShort(order.created_at)}
                        {isMobile && ` · ${getShortPickupLabel(order)} · ${paymentLabel}`}
                      </span>
                    </div>
                    {!isMobile && (
                      <>
                        <span style={localStyles.pickupBadge}>{getShortPickupLabel(order)}</span>
                        <span style={localStyles.paymentBadge}>{paymentLabel}</span>
                        <strong style={localStyles.rowTotal}>{money(calcTotal(order))}</strong>
                      </>
                    )}
                    {isMobile && (
                      <strong style={localStyles.rowTotalMobile}>{money(calcTotal(order))}</strong>
                    )}
                    <span style={localStyles.expandIcon}>{expanded ? "▲" : "▼"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => printOrder(order)}
                    style={{
                      ...localStyles.printButton,
                      ...(isMobile ? localStyles.printButtonMobile : {}),
                    }}
                    aria-label={`Imprimir pedido ${order.id}`}
                  >
                    Imprimir
                  </button>
                </div>

                {expanded && (
                  <div style={localStyles.details}>
                    <div style={localStyles.itemList}>
                      {(order.items || []).length > 0 ? (
                        (order.items || []).map((item, index) => (
                          <span key={`${order.id}-${item.id}-${index}`} style={localStyles.itemLine}>
                            {formatOrderItemLabel(item)}
                          </span>
                        ))
                      ) : (
                        <span style={localStyles.muted}>Sem itens salvos neste pedido.</span>
                      )}
                    </div>
                    {addonSummary && (
                      <p style={localStyles.detailLine}>
                        <strong>Complementos:</strong> {addonSummary}
                      </p>
                    )}
                    {hasNote && (
                      <p style={localStyles.detailNote}>
                        <strong>Observação:</strong> {order.note?.trim()}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

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
    marginBottom: 14,
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
  tableHead: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) 140px 90px 110px 92px",
    gap: 12,
    padding: "0 14px 10px",
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  tableHeadCenter: {
    textAlign: "center",
  },
  list: {
    display: "grid",
    gap: 8,
  },
  orderBlock: {
    display: "grid",
    gap: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "stretch",
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 26, 23, 0.06)",
    borderRadius: 8,
    overflow: "hidden",
  },
  rowMobile: {
    gridTemplateColumns: "1fr",
  },
  rowMainButton: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) 140px 90px 110px 28px",
    gap: 12,
    alignItems: "center",
    border: "none",
    background: "transparent",
    color: "inherit",
    padding: "14px",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    minWidth: 0,
  },
  rowMainButtonMobile: {
    gridTemplateColumns: "minmax(0, 1fr) auto 24px",
    gap: 10,
    alignItems: "start",
  },
  rowIdentity: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 1.2,
  },
  rowCustomer: {
    color: "#514a43",
    fontSize: 14,
    fontWeight: 750,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: {
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
  },
  pickupBadge: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
    textAlign: "center",
    justifySelf: "center",
  },
  paymentBadge: {
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#0f7a4a",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
    textAlign: "center",
    justifySelf: "center",
  },
  rowTotal: {
    fontSize: 15,
    fontWeight: 850,
    whiteSpace: "nowrap",
    textAlign: "center",
    justifySelf: "center",
  },
  rowTotalMobile: {
    fontSize: 16,
    fontWeight: 850,
    whiteSpace: "nowrap",
    alignSelf: "start",
    marginTop: 2,
  },
  expandIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 900,
    lineHeight: 1,
    flexShrink: 0,
  },
  printButton: {
    border: "none",
    borderLeft: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  printButtonMobile: {
    borderLeft: "none",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "12px 14px",
    width: "100%",
  },
  details: {
    border: "1px solid rgba(28, 26, 23, 0.06)",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    background: "#faf8f4",
    padding: "12px 14px 14px",
    marginTop: -8,
    display: "grid",
    gap: 10,
  },
  itemList: {
    display: "grid",
    gap: 6,
  },
  itemLine: {
    color: "#1c1a17",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  detailLine: {
    margin: 0,
    color: "#514a43",
    fontSize: 13,
    lineHeight: 1.45,
  },
  detailNote: {
    margin: 0,
    color: "#514a43",
    fontSize: 13,
    lineHeight: 1.45,
    borderLeft: "3px solid #9f1d2f",
    paddingLeft: 10,
  },
  muted: {
    color: "#766e64",
    padding: "12px 14px",
    fontSize: 14,
  },
};
