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
  const chartData = {
    labels: dailyLabels.map(formatDateKey),
    datasets: [
      {
        label: "Faturamento",
        data: dailyLabels.map((day) => analytics.revenueByDay[day]),
        backgroundColor: dailyLabels.map((_, i) =>
          i === dailyLabels.length - 1 ? "#9f1d2f" : "rgba(159, 29, 47, 0.35)"
        ),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 44,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        display: !isMobile,
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
        cornerRadius: 10,
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => money(Number(ctx.raw || 0)),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#9a9288", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "rgba(28, 26, 23, 0.06)" },
        ticks: {
          color: "#9a9288",
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (v) => (typeof v === "number" ? money(v) : v),
        },
      },
    },
  };

  const paymentEntries = Object.entries(analytics.paymentTotals).sort((a, b) => b[1] - a[1]);
  const paymentTotal = paymentEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div style={fat.page}>
      <section style={{ ...fat.hero, ...(isMobile || isTablet ? fat.heroMobile : {}) }}>
        <article style={fat.heroMain}>
          <span style={fat.heroGlow} aria-hidden="true" />
          <span style={fat.heroLabel}>Receita no período</span>
          <strong style={fat.heroValue}>
            {loading ? "—" : money(analytics.totalRevenue)}
          </strong>
          <span style={fat.heroMeta}>
            {loading
              ? "Calculando..."
              : `${number(analytics.orderCount)} pedidos · ${number(analytics.uniqueCustomers)} clientes`}
          </span>
        </article>

        <StatCard label="Hoje" value={loading ? "—" : money(analytics.todayRevenue)} detail="Receita de hoje" />
        <StatCard label="Ticket" value={loading ? "—" : money(analytics.ticketMedio)} detail="Média por pedido" />
        <StatCard
          label="Descontos"
          value={loading ? "—" : money(analytics.totalDiscount)}
          detail={
            Object.keys(analytics.couponTotals).length > 0
              ? `${Object.keys(analytics.couponTotals).length} cupom(ns)`
              : "Sem cupons"
          }
        />
        <StatCard label="Pedidos" value={loading ? "—" : number(analytics.orderCount)} detail="Confirmados" />
      </section>

      <section style={{ ...fat.bento, ...(isTablet ? fat.bentoStack : {}) }}>
        <article style={fat.panel}>
          <div style={fat.panelHeader}>
            <h3 style={fat.panelTitle}>Evolução diária</h3>
            <span style={fat.panelBadge}>{dailyLabels.length} dia(s)</span>
          </div>
          <div style={{ height: isMobile ? 220 : 300, minHeight: isMobile ? 220 : 300 }}>
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
          <article style={fat.panel}>
            <div style={fat.panelHeader}>
              <h3 style={fat.panelTitle}>Formas de pagamento</h3>
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

          {Object.keys(analytics.couponTotals).length > 0 && (
            <article style={fat.panel}>
              <div style={fat.panelHeader}>
                <h3 style={fat.panelTitle}>Cupons utilizados</h3>
              </div>
              <div style={fat.rankList}>
                {Object.entries(analytics.couponTotals).map(([code, value]) => (
                  <div key={code} style={fat.rankItem}>
                    <span style={{ ...fat.rankIndex, background: "#9f1d2f" }}>%</span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={fat.rankName}>{code}</strong>
                      <p style={fat.rankSub}>Desconto aplicado</p>
                    </div>
                    <strong style={fat.rankValue}>{money(value)}</strong>
                  </div>
                ))}
              </div>
            </article>
          )}
        </aside>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <RankingPanel
          title="Mais vendidos"
          loading={loading}
          empty="Nenhum item vendido."
          items={analytics.topItems.map((item, i) => ({
            key: item.name,
            index: i + 1,
            name: item.name,
            sub: `${number(item.quantity)} unidades`,
            value: money(item.revenue),
          }))}
        />
        <RankingPanel
          title="Melhores clientes"
          loading={loading}
          empty="Nenhum cliente no período."
          items={analytics.topCustomers.map((c, i) => ({
            key: c.phone,
            index: i + 1,
            name: formatName(c.name),
            sub: `${number(c.orders)} pedido(s)`,
            value: money(c.revenue),
            onClick: onSelectCustomer ? () => onSelectCustomer(c.phone) : undefined,
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

function RankingPanel({
  title,
  items,
  loading,
  empty,
}: {
  title: string;
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
        <h3 style={fat.panelTitle}>{title}</h3>
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
                    border: "1px solid rgba(28, 26, 23, 0.05)",
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
