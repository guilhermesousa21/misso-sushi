"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { printOrder } from "../../../lib/printOrder";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
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

const parseSupabaseDate = (value: string) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

const toBrasiliaDateKey = (value: string | Date) => {
  const date = typeof value === "string" ? parseSupabaseDate(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

const getDateRangeStart = (range: DateRange) => {
  if (range === "all" || range === "custom") return "";

  const start = new Date();
  if (range === "7d") start.setDate(start.getDate() - 6);
  if (range === "30d") start.setDate(start.getDate() - 29);
  return toBrasiliaDateKey(start);
};

const formatBrasiliaDateTime = (value: string) =>
  parseSupabaseDate(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const isTablet = useMediaQuery("(max-width: 1040px)");

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (mounted) {
        setOrders(
          (data || [])
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
        setOrders((prev) => [order, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const order = normalizeOrder(payload.new as AdminOrder);
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === order.id);
          return exists
            ? prev.map((o) => (o.id === order.id ? order : o))
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
      action={<span style={styles.pill}>{loading ? "Carregando" : `${number(filteredOrders.length)} pedidos`}</span>}
    >
      <section style={localStyles.summaryGrid}>
        <div style={localStyles.summaryCard}>
          <span style={localStyles.summaryLabel}>Pedidos filtrados</span>
          <strong style={localStyles.summaryValue}>{number(filteredOrders.length)}</strong>
        </div>
        <div style={localStyles.summaryCard}>
          <span style={localStyles.summaryLabel}>Total no filtro</span>
          <strong style={localStyles.summaryValue}>{money(summary.total)}</strong>
        </div>
        <div style={localStyles.summaryCard}>
          <span style={localStyles.summaryLabel}>Ticket médio</span>
          <strong style={localStyles.summaryValue}>{money(summary.average)}</strong>
        </div>
        <div style={localStyles.summaryCard}>
          <span style={localStyles.summaryLabel}>Período</span>
          <strong style={localStyles.summaryValue}>{dateRangeLabels[dateRange]}</strong>
        </div>
      </section>

      <section style={localStyles.filtersCard}>
        <div style={{ ...localStyles.filtersGrid, ...(isTablet ? localStyles.filtersGridStack : {}) }}>
          <label style={localStyles.field}>
            <span style={localStyles.fieldLabel}>Busca</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pedido, cliente ou telefone"
              style={localStyles.control}
            />
          </label>
          <label style={localStyles.field}>
            <span style={localStyles.fieldLabel}>Data</span>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
              style={localStyles.control}
            >
              {(Object.keys(dateRangeLabels) as DateRange[]).map((option) => (
                <option key={option} value={option}>
                  {dateRangeLabels[option]}
                </option>
              ))}
            </select>
          </label>
          {dateRange === "custom" && (
            <>
              <label style={localStyles.field}>
                <span style={localStyles.fieldLabel}>Início</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  style={localStyles.control}
                  aria-label="Data inicial"
                />
              </label>
              <label style={localStyles.field}>
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
        </div>
      </section>

      <section style={localStyles.listPanel}>
        <div style={localStyles.listHeader}>
          <div>
            <p style={styles.cardEyebrow}>Histórico</p>
            <h2 style={styles.cardTitle}>Lista de pedidos</h2>
          </div>
        </div>

        {filteredOrders.map((order) => (
          <article key={order.id} style={localStyles.orderCard}>
            <div style={localStyles.orderHeader}>
              <div style={localStyles.orderTitleBlock}>
                <div style={localStyles.orderTitleRow}>
                  <strong style={localStyles.orderTitle}>Pedido #{order.id}</strong>
                </div>
                <p style={localStyles.customerLine}>
                  {order.name || "Cliente"} - {order.phone || "Sem telefone"}
                </p>
                <p style={styles.mutedSmall}>{formatBrasiliaDateTime(order.created_at)}</p>
              </div>
              <strong style={localStyles.orderTotal}>{money(calcTotal(order))}</strong>
            </div>

            <div style={localStyles.itemList}>
              {(order.items || []).map((item, index) => (
                <span key={`${order.id}-${item.id}-${index}`} style={localStyles.itemLine}>
                  {item.quantity ?? 1}x {item.name}
                </span>
              ))}
              {(order.items || []).length === 0 && (
                <span style={styles.mutedSmall}>Sem itens salvos neste pedido.</span>
              )}
            </div>

            {order.note && <p style={localStyles.note}>Obs: {order.note}</p>}

            <div style={localStyles.actionsBar}>
              <button
                type="button"
                onClick={() => printOrder(order)}
                style={localStyles.actionButton}
              >
                Imprimir
              </button>
            </div>
          </article>
        ))}

        {!loading && filteredOrders.length === 0 && (
          <EmptyState text="Nenhum pedido encontrado para os filtros atuais." />
        )}
      </section>
    </AdminShell>
  );
}

const localStyles: Record<string, CSSProperties> = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    background: "#1c1a17",
    borderRadius: 8,
    padding: 16,
    color: "#fffdf8",
    minHeight: 96,
    display: "grid",
    alignContent: "space-between",
  },
  summaryLabel: {
    color: "rgba(255, 253, 248, 0.68)",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 1,
  },
  filtersCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 14,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.04)",
    marginBottom: 14,
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(150px, 210px) minmax(140px, 180px) minmax(140px, 180px)",
    gap: 10,
    alignItems: "end",
  },
  filtersGridStack: {
    gridTemplateColumns: "1fr",
  },
  field: {
    display: "grid",
    gap: 6,
  },
  fieldLabel: {
    color: "#766e64",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  control: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: "12px 13px",
    background: "#fffdf8",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
    minHeight: 46,
  },
  listPanel: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: "18px 20px 6px",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.04)",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 4,
  },
  orderCard: {
    padding: "14px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    background: "transparent",
  },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 14,
  },
  orderTitleBlock: {
    minWidth: 0,
  },
  orderTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  orderTitle: {
    fontSize: 18,
    lineHeight: 1.1,
  },
  customerLine: {
    marginTop: 6,
    color: "#514a43",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  orderTotal: {
    fontSize: 17,
    whiteSpace: "nowrap",
  },
  itemList: {
    display: "grid",
    gap: 4,
    marginTop: 10,
  },
  itemLine: {
    color: "#514a43",
    fontSize: 13,
    fontWeight: 800,
  },
  note: {
    marginTop: 12,
    color: "#625b53",
    lineHeight: 1.45,
  },
  actionsBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "8px 11px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 850,
  },
};
