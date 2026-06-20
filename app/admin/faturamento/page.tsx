"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { supabase } from "../../../lib/supabase";
import {
  addDaysInBrasilia,
  formatBrasiliaDateTimeShort,
  toBrasiliaDateKey,
} from "../../../lib/brasiliaTime";
import { useIsMobile, useIsTablet } from "../../../lib/useMediaQuery";
import { AdminShell } from "../AdminShell";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ChartDataLabels
);

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity?: number;
};

type Order = {
  id: number | string;
  name?: string;
  phone?: string;
  items?: OrderItem[] | null;
  note?: string | null;
  total?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  coupon_code?: string | null;
  created_at: string;
  payment_method?: string | null;
  payment_status?: string | null;
};

type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

const rangeLabels: Record<RangePreset, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  custom: "Período",
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const number = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getRangeStart = (range: RangePreset) => {
  if (range === "custom") return "";
  if (range === "today") return toBrasiliaDateKey(new Date());

  const days = Number(range.replace("d", "")) - 1;
  return toBrasiliaDateKey(addDaysInBrasilia(new Date(), -days));
};

const formatDateKey = (value: string) => {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
};

const formatDateTime = formatBrasiliaDateTimeShort;

const calcTotal = (order: Order) =>
  typeof order.total === "number"
    ? order.total
    : (order.items || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * (item.quantity ?? 1),
        0
      );

const calcDiscount = (order: Order) => Number(order.discount_amount || 0);

const getPayment = (order: Order) => order.payment_method || "";

export default function FaturamentoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangePreset>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "pago")
        .order("created_at", { ascending: false });

      if (mounted) {
        if (!error && data) {
          setOrders(
            data
              .filter((order) => (order as Order).payment_status === "pago")
              .map((order) => ({
                ...(order as Order),
                items: Array.isArray((order as Order).items)
                  ? (order as Order).items
                  : [],
              }))
          );
        }
        setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const rangeStart = range === "custom" ? dateFrom : getRangeStart(range);
    const rangeEnd = range === "custom" ? dateTo : range === "today" ? toBrasiliaDateKey(new Date()) : "";

    return orders.filter((order) => {
      const orderDate = toBrasiliaDateKey(order.created_at);
      const inRangeStart = !rangeStart || orderDate >= rangeStart;
      const inRangeEnd = !rangeEnd || orderDate <= rangeEnd;
      const query = normalize(search.trim());
      const bySearch =
        !query ||
        normalize(String(order.id)).includes(query) ||
        normalize(order.name || "").includes(query) ||
        normalize(order.phone || "").includes(query);

      return inRangeStart && inRangeEnd && bySearch;
    });
  }, [dateFrom, dateTo, orders, range, search]);

  const analytics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + calcTotal(order),
      0
    );
    const ticketMedio =
      filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    const todayKey = toBrasiliaDateKey(new Date());
    const todayRevenue = filteredOrders
      .filter((order) => toBrasiliaDateKey(order.created_at) === todayKey)
      .reduce((sum, order) => sum + calcTotal(order), 0);
    const totalDiscount = filteredOrders.reduce(
      (sum, order) => sum + calcDiscount(order),
      0
    );

    const revenueByDay = filteredOrders.reduce((acc, order) => {
      const day = toBrasiliaDateKey(order.created_at);
      acc[day] = (acc[day] || 0) + calcTotal(order);
      return acc;
    }, {} as Record<string, number>);

    const paymentTotals = filteredOrders.reduce((acc, order) => {
      const payment = getPayment(order);
      acc[payment] = (acc[payment] || 0) + calcTotal(order);
      return acc;
    }, {} as Record<string, number>);

    const couponTotals = filteredOrders.reduce((acc, order) => {
      if (!order.coupon_code) return acc;
      acc[order.coupon_code] = (acc[order.coupon_code] || 0) + calcDiscount(order);
      return acc;
    }, {} as Record<string, number>);

    const topItems = filteredOrders
      .flatMap((order) => order.items || [])
      .reduce((acc, item) => {
        const current = acc.get(item.name) || { quantity: 0, revenue: 0 };
        const quantity = item.quantity ?? 1;
        current.quantity += quantity;
        current.revenue += Number(item.price || 0) * quantity;
        acc.set(item.name, current);
        return acc;
      }, new Map<string, { quantity: number; revenue: number }>());

    const bestDay = Object.entries(revenueByDay).sort((a, b) => b[1] - a[1])[0];
    const averagePerDay =
      Object.keys(revenueByDay).length > 0
        ? totalRevenue / Object.keys(revenueByDay).length
        : 0;

    return {
      averagePerDay,
      bestDay,
      couponTotals,
      paymentTotals,
      revenueByDay,
      ticketMedio,
      todayRevenue,
      totalDiscount,
      topItems: Array.from(topItems.entries())
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
        .slice(0, 10),
      totalRevenue,
    };
  }, [filteredOrders]);

  const dailyLabels = Object.keys(analytics.revenueByDay).sort();
  const chartDataBar = {
    labels: dailyLabels.map((day) => formatDateKey(day)),
    datasets: [
      {
        label: "Faturamento",
        data: dailyLabels.map((day) => analytics.revenueByDay[day]),
        backgroundColor: "#9f1d2f",
        borderColor: "#7f1726",
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value: number) => (value > 0 ? money(value) : ""),
        color: "#514a43",
        font: { weight: "bold", size: 11 },
        clamp: true,
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            return money(Number(context.raw || 0));
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#766e64" },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "rgba(28, 26, 23, 0.08)" },
        ticks: {
          color: "#766e64",
          callback: function (tickValue) {
            return typeof tickValue === "number" ? money(tickValue) : tickValue;
          },
        },
      },
    },
  };

  return (
    <AdminShell
      eyebrow="Financeiro"
      title="Faturamento"
      action={
        <span style={styles.countPill}>
          {loading ? "Carregando" : `${number(filteredOrders.length)} pedidos`}
        </span>
      }
    >

        <section
          style={{
            ...styles.toolbar,
            ...(range === "custom" ? styles.toolbarCustom : {}),
            ...(isTablet ? styles.toolbarStack : {}),
          }}
          aria-label="Filtros de faturamento"
        >
          <label style={styles.periodField}>
            <span style={styles.fieldLabel}>Período</span>
            <div style={{ ...styles.segmented, ...(isMobile ? styles.segmentedMobile : {}) }}>
              {(Object.keys(rangeLabels) as RangePreset[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  style={{
                    ...styles.segmentButton,
                    ...(range === option ? styles.segmentButtonActive : {}),
                  }}
                >
                  {rangeLabels[option]}
                </button>
              ))}
            </div>
          </label>
          {range === "custom" && (
            <>
              <label style={styles.dateField}>
                <span style={styles.fieldLabel}>Início</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  style={styles.input}
                  aria-label="Data inicial"
                />
              </label>
              <label style={styles.dateField}>
                <span style={styles.fieldLabel}>Fim</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  style={styles.input}
                  aria-label="Data final"
                />
              </label>
            </>
          )}
          <label style={styles.dateField}>
            <span style={styles.fieldLabel}>Busca</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, telefone ou pedido"
              style={styles.input}
            />
          </label>
        </section>

        <section style={{ ...styles.metrics, ...(isMobile ? styles.metricsMobile : {}) }}>
          <Metric
            label="Faturamento"
            value={money(analytics.totalRevenue)}
            detail={`${number(filteredOrders.length)} pedidos no período`}
          />
          <Metric
            label="Hoje"
            value={money(analytics.todayRevenue)}
            detail="Receita dentro dos filtros"
          />
          <Metric
            label="Ticket médio"
            value={money(analytics.ticketMedio)}
            detail="Valor médio por pedido"
          />
          <Metric
            label="Descontos"
            value={money(analytics.totalDiscount)}
            detail={
              Object.keys(analytics.couponTotals).length > 0
                ? `${Object.keys(analytics.couponTotals).length} cupons usados`
                : "Nenhum cupom no período"
            }
          />
        </section>

        <section style={{ ...styles.dashboardGrid, ...(isTablet ? styles.dashboardGridStack : {}) }}>
          <article style={{ ...styles.chartCard, ...(isMobile ? styles.chartCardMobile : {}) }}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Evolução</p>
                <h2 style={styles.cardTitle}>Faturamento diário</h2>
              </div>
              <span style={styles.pill}>{dailyLabels.length} dia(s)</span>
            </div>
            <div style={{ ...styles.chartBox, ...(isMobile ? styles.chartBoxMobile : {}) }}>
              {loading ? (
                <p style={styles.muted}>Carregando dados...</p>
              ) : filteredOrders.length === 0 ? (
                <EmptyState />
              ) : (
                <Bar data={chartDataBar} options={chartOptions} />
              )}
            </div>
          </article>

          <aside style={styles.sideStack}>
            <Breakdown
              title="Pagamento"
              entries={Object.entries(analytics.paymentTotals).map(([label, value]) => ({
                label: paymentLabels[label] || label,
                value,
                display: money(value),
              }))}
            />
            <Breakdown
              title="Cupons"
              entries={Object.entries(analytics.couponTotals).map(([label, value]) => ({
                label,
                value,
                display: money(value),
              }))}
            />
          </aside>
        </section>

        <section style={{ ...styles.bottomGrid, ...(isTablet ? styles.bottomGridStack : {}) }}>
          <article style={{ ...styles.card, ...(isMobile ? styles.cardMobile : {}) }}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Pedidos</p>
                <h2 style={styles.cardTitle}>Últimos lançamentos</h2>
              </div>
            </div>
            <div style={styles.table}>
              {filteredOrders.slice(0, 8).map((order) => (
                <div key={order.id} style={{ ...styles.tableRow, ...(isMobile ? styles.tableRowMobile : {}) }}>
                  <div>
                    <strong>#{order.id}</strong>
                    <p style={styles.mutedSmall}>
                      {order.name || "Cliente"} - {formatDateTime(order.created_at)}
                    </p>
                    {order.coupon_code && (
                      <p style={styles.mutedSmall}>
                        Cupom {order.coupon_code} - desconto {money(calcDiscount(order))}
                      </p>
                    )}
                  </div>
                  <strong style={{ ...styles.alignRight, ...(isMobile ? styles.alignLeftMobile : {}) }}>{money(calcTotal(order))}</strong>
                </div>
              ))}
              {!loading && filteredOrders.length === 0 && <EmptyState />}
            </div>
          </article>

          <article style={{ ...styles.card, ...(isMobile ? styles.cardMobile : {}) }}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Cardápio</p>
                <h2 style={styles.cardTitle}>Itens mais vendidos</h2>
              </div>
            </div>
            <div style={styles.itemRanking}>
              {analytics.topItems.map((item, index) => (
                <div key={item.name} style={{ ...styles.rankRow, ...(isMobile ? styles.rankRowMobile : {}) }}>
                  <span style={styles.rankNumber}>{index + 1}</span>
                  <div style={styles.rankMain}>
                    <strong>{item.name}</strong>
                    <p style={styles.mutedSmall}>{number(item.quantity)} unidade(s)</p>
                  </div>
                  <strong>{money(item.revenue)}</strong>
                </div>
              ))}
              {!loading && analytics.topItems.length === 0 && <EmptyState />}
            </div>
          </article>
        </section>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      <span style={styles.metricDetail}>{detail}</span>
    </article>
  );
}

function Breakdown({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; value: number; display: string }[];
}) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <article style={styles.card}>
      <div style={styles.cardHeaderCompact}>
        <p style={styles.cardEyebrow}>Resumo</p>
        <h2 style={styles.sideTitle}>{title}</h2>
      </div>
      <div style={styles.breakdownList}>
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          entries.map((entry) => {
            const percent = total > 0 ? (entry.value / total) * 100 : 0;

            return (
              <div key={entry.label} style={styles.breakdownItem}>
                <div style={styles.breakdownLine}>
                  <span>{entry.label}</span>
                  <strong>{entry.display}</strong>
                </div>
                <div style={styles.progressTrack}>
                  <span style={{ ...styles.progressFill, width: `${percent}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

function EmptyState() {
  return <p style={styles.muted}>Nenhum dado encontrado para os filtros atuais.</p>;
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
  sidebarMobile: {
    position: "sticky",
    top: 0,
    zIndex: 30,
    padding: "12px 12px 10px",
    gap: 10,
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
  navMobile: {
    flexWrap: "nowrap",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 2,
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
  content: {
    padding: "28px 24px 56px",
    minWidth: 0,
  },
  contentMobile: {
    padding: "18px 12px 42px",
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
    gap: 10,
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
    fontSize: 32,
  },
  countPill: {
    borderRadius: 999,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "10px 13px",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(300px, 1.2fr) minmax(240px, 1fr)",
    gap: 10,
    marginBottom: 14,
    alignItems: "end",
  },
  toolbarCustom: {
    gridTemplateColumns: "minmax(300px, 1.2fr) minmax(140px, 180px) minmax(140px, 180px) minmax(240px, 1fr)",
  },
  toolbarStack: {
    gridTemplateColumns: "1fr",
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 4,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 8,
    padding: 4,
    minHeight: 48,
  },
  segmentedMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  segmentButton: {
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#514a43",
    padding: "10px 8px",
    cursor: "pointer",
    fontWeight: 850,
  },
  segmentButtonActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: "12px 13px",
    background: "#fffdf8",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
    minHeight: 48,
  },
  periodField: {
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
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  select: {
    width: "100%",
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
  metricsMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  metricCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
    minHeight: 132,
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
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
    gap: 16,
    alignItems: "stretch",
    marginBottom: 16,
  },
  dashboardGridStack: {
    gridTemplateColumns: "1fr",
  },
  chartCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
    minWidth: 0,
  },
  chartCardMobile: {
    padding: 14,
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
    minWidth: 0,
  },
  cardMobile: {
    padding: 14,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 18,
  },
  cardHeaderCompact: {
    marginBottom: 14,
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
  sideTitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 1.15,
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
  chartBox: {
    height: 360,
    minHeight: 360,
  },
  chartBoxMobile: {
    height: 280,
    minHeight: 280,
  },
  sideStack: {
    display: "grid",
    gap: 16,
  },
  breakdownList: {
    display: "grid",
    gap: 14,
  },
  breakdownItem: {
    display: "grid",
    gap: 8,
  },
  breakdownLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#514a43",
    fontSize: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    background: "#f0ebe2",
  },
  progressFill: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "#9f1d2f",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 16,
  },
  bottomGridStack: {
    gridTemplateColumns: "1fr",
  },
  table: {
    display: "grid",
    gap: 2,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) 120px",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  tableRowMobile: {
    gridTemplateColumns: "1fr",
    gap: 6,
  },
  alignRight: {
    textAlign: "right",
  },
  alignLeftMobile: {
    textAlign: "left",
  },
  itemRanking: {
    display: "grid",
    gap: 10,
  },
  rankRow: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,
    padding: "11px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  rankRowMobile: {
    gridTemplateColumns: "28px minmax(0, 1fr)",
  },
  rankNumber: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    background: "#1c1a17",
    color: "#fffdf8",
    fontWeight: 850,
  },
  rankMain: {
    minWidth: 0,
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
};
