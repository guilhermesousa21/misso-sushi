"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useIsMobile, useIsTablet } from "../../../lib/useMediaQuery";
import { money, number, type AdminOrder } from "../AdminShell";
import { buildFaturamentoAnalytics } from "./faturamentoAnalytics";
import { fat } from "./faturamentoStyles";

ChartJS.register(Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels);

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

const formatDateKey = (value: string) => {
  const [, month, day] = value.split("-");
  return month && day ? `${day}/${month}` : value;
};

const formatName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\b[\p{L}]/gu, (char) => char.toUpperCase());

function paymentFillStyle(key: string): CSSProperties {
  if (key === "pix") return fat.paymentFillPix;
  if (key === "card") return fat.paymentFillCard;
  return fat.paymentFillOther;
}

export default function FaturamentoInsights({
  orders,
  loading,
  onSelectCustomer,
}: {
  orders: AdminOrder[];
  loading: boolean;
  onSelectCustomer?: (phone: string) => void;
}) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const analytics = useMemo(() => buildFaturamentoAnalytics(orders), [orders]);

  const dailyLabels = Object.keys(analytics.revenueByDay).sort();
  const strongestDay = dailyLabels.reduce(
    (best, day) => (analytics.revenueByDay[day] > best.value ? { day, value: analytics.revenueByDay[day] } : best),
    { day: "", value: 0 }
  );

  const chartData = {
    labels: dailyLabels.map(formatDateKey),
    datasets: [
      {
        label: "Faturamento",
        data: dailyLabels.map((day) => analytics.revenueByDay[day]),
        backgroundColor: dailyLabels.map((day) =>
          day === strongestDay.day ? "#9f1d2f" : "rgba(159, 29, 47, 0.28)"
        ),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        display: !isMobile && dailyLabels.length <= 14,
        anchor: "end",
        align: "top",
        formatter: (value: number) => (value > 0 ? money(value) : ""),
        color: "#625b53",
        font: { weight: "bold", size: 10 },
        clamp: true,
      },
      tooltip: {
        backgroundColor: "#1c1a17",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => money(Number(ctx.raw || 0)),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#766e64", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "rgba(28, 26, 23, 0.07)" },
        ticks: {
          color: "#766e64",
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value) => (typeof value === "number" ? money(value) : value),
        },
      },
    },
  };

  const paymentEntries = Object.entries(analytics.paymentTotals).sort((a, b) => b[1] - a[1]);
  const paymentTotal = paymentEntries.reduce((sum, [, value]) => sum + value, 0);
  const customerAverage =
    analytics.uniqueCustomers > 0 ? analytics.totalRevenue / analytics.uniqueCustomers : 0;

  return (
    <div style={fat.page}>
      <section style={{ ...fat.summary, ...(isMobile || isTablet ? fat.summaryStack : {}) }}>
        <article style={fat.revenueCard}>
          <span style={fat.revenueAccent} aria-hidden="true" />
          <span style={fat.heroLabel}>Receita no período</span>
          <strong style={fat.heroValue}>{loading ? "—" : money(analytics.totalRevenue)}</strong>
          <span style={fat.heroMeta}>
            {loading
              ? "Calculando vendas confirmadas..."
              : `${number(analytics.orderCount)} pedidos pagos · ${number(analytics.uniqueCustomers)} clientes`}
          </span>
        </article>

        <StatCard label="Hoje" value={loading ? "—" : money(analytics.todayRevenue)} detail="Entrada do dia" />
        <StatCard label="Ticket médio" value={loading ? "—" : money(analytics.ticketMedio)} detail="Por pedido pago" />
        <StatCard label="Por cliente" value={loading ? "—" : money(customerAverage)} detail="Média no filtro" />
        <StatCard
          label="Descontos"
          value={loading ? "—" : money(analytics.totalDiscount)}
          detail={
            Object.keys(analytics.couponTotals).length > 0
              ? `${Object.keys(analytics.couponTotals).length} cupom(ns)`
              : "Sem cupons"
          }
        />
      </section>

      <section style={{ ...fat.bento, ...(isTablet ? fat.bentoStack : {}) }}>
        <article style={fat.panel}>
          <div style={fat.panelHeader}>
            <div>
              <h3 style={fat.panelTitle}>Evolução diária</h3>
              <p style={fat.panelSubtitle}>
                {strongestDay.day
                  ? `Melhor dia: ${formatDateKey(strongestDay.day)} com ${money(strongestDay.value)}`
                  : "Acompanhe os dias com venda confirmada."}
              </p>
            </div>
            <span style={fat.panelBadge}>{dailyLabels.length} dia(s)</span>
          </div>
          <div style={{ height: isMobile ? 230 : 310, minHeight: isMobile ? 230 : 310 }}>
            {loading ? (
              <p style={fat.empty}>Carregando gráfico...</p>
            ) : orders.length === 0 ? (
              <p style={fat.empty}>Sem vendas no período selecionado.</p>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>
        </article>

        <aside style={fat.sideStack}>
          <article style={{ ...fat.panel, ...fat.panelTight }}>
            <div style={fat.panelHeader}>
              <div>
                <h3 style={fat.panelTitle}>Formas de pagamento</h3>
                <p style={fat.panelSubtitle}>Participação no faturamento filtrado.</p>
              </div>
            </div>
            <div style={fat.paymentRow}>
              {paymentEntries.length === 0 ? (
                <p style={fat.empty}>Sem dados.</p>
              ) : (
                paymentEntries.map(([key, value]) => {
                  const pct = paymentTotal > 0 ? (value / paymentTotal) * 100 : 0;
                  return (
                    <div key={key} style={fat.paymentItem}>
                      <div style={fat.paymentLine}>
                        <span>{paymentLabels[key] || key || "Outros"}</span>
                        <strong>
                          {money(value)} · {pct.toFixed(0)}%
                        </strong>
                      </div>
                      <div style={fat.paymentBar}>
                        <span style={{ ...paymentFillStyle(key), width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <CouponPanel coupons={analytics.couponTotals} />
        </aside>
      </section>

      <section style={{ ...fat.rankGrid, ...(isMobile ? fat.rankGridStack : {}) }}>
        <RankingPanel
          title="Mais vendidos"
          subtitle="Itens com maior saída no período."
          loading={loading}
          empty="Nenhum item vendido."
          items={analytics.topItems.map((item, index) => ({
            key: item.name,
            index: index + 1,
            name: item.name,
            sub: `${number(item.quantity)} unidades`,
            value: money(item.revenue),
          }))}
        />
        <RankingPanel
          title="Melhores clientes"
          subtitle="Clique para ver os pedidos do cliente."
          loading={loading}
          empty="Nenhum cliente no período."
          items={analytics.topCustomers.map((customer, index) => ({
            key: customer.phone,
            index: index + 1,
            name: formatName(customer.name),
            sub: `${number(customer.orders)} pedido(s)`,
            value: money(customer.revenue),
            onClick: onSelectCustomer ? () => onSelectCustomer(customer.phone) : undefined,
          }))}
        />
      </section>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article style={fat.statCard}>
      <span style={fat.statLabel}>{label}</span>
      <strong style={fat.statValue}>{value}</strong>
      <span style={fat.statDetail}>{detail}</span>
    </article>
  );
}

function CouponPanel({ coupons }: { coupons: Record<string, number> }) {
  const entries = Object.entries(coupons).sort((a, b) => b[1] - a[1]);

  return (
    <article style={{ ...fat.panel, ...fat.panelTight }}>
      <div style={fat.panelHeader}>
        <div>
          <h3 style={fat.panelTitle}>Cupons utilizados</h3>
          <p style={fat.panelSubtitle}>Total de desconto por código.</p>
        </div>
      </div>
      <div style={fat.rankList}>
        {entries.length === 0 ? (
          <p style={fat.empty}>Nenhum cupom aplicado.</p>
        ) : (
          entries.map(([code, value]) => (
            <div key={code} style={fat.rankItem}>
              <span style={{ ...fat.rankIndex, background: "#9f1d2f" }}>%</span>
              <div style={{ minWidth: 0 }}>
                <strong style={fat.rankName}>{code}</strong>
                <p style={fat.rankSub}>Desconto aplicado</p>
              </div>
              <strong style={fat.rankValue}>{money(value)}</strong>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function RankingPanel({
  title,
  subtitle,
  items,
  loading,
  empty,
}: {
  title: string;
  subtitle: string;
  items: {
    key: string;
    index: number;
    name: string;
    sub: string;
    value: string;
    onClick?: () => void;
  }[];
  loading: boolean;
  empty: string;
}) {
  return (
    <article style={fat.panel}>
      <div style={fat.panelHeader}>
        <div>
          <h3 style={fat.panelTitle}>{title}</h3>
          <p style={fat.panelSubtitle}>{subtitle}</p>
        </div>
      </div>
      <div style={fat.rankList}>
        {loading ? (
          <p style={fat.empty}>Carregando...</p>
        ) : items.length === 0 ? (
          <p style={fat.empty}>{empty}</p>
        ) : (
          items.map((item) => {
            const inner = (
              <>
                <span style={fat.rankIndex}>{item.index}</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={fat.rankName}>{item.name}</strong>
                  <p style={fat.rankSub}>{item.sub}</p>
                </div>
                <strong style={fat.rankValue}>{item.value}</strong>
              </>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  style={{
                    ...fat.rankItem,
                    width: "100%",
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={item.key} style={fat.rankItem}>
                {inner}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
