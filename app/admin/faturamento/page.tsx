"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  TooltipItem,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { supabase } from "../../../lib/supabase";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ChartDataLabels
);

type Order = {
  id: string;
  name: string;
  total: number;
  created_at: string;
  payment_method: string;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function FaturamentoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data as Order[]);
      setLoading(false);
    }

    fetchOrders();
  }, []);

  const faturamentoTotal = orders.reduce((acc, order) => acc + order.total, 0);
  const ticketMedio = orders.length > 0 ? faturamentoTotal / orders.length : 0;

  const faturamentoPorDia: Record<string, number> = {};
  orders.forEach((order) => {
    const dia = new Date(order.created_at).toLocaleDateString("pt-BR");
    faturamentoPorDia[dia] = (faturamentoPorDia[dia] || 0) + order.total;
  });

  const chartDataBar = {
    labels: Object.keys(faturamentoPorDia),
    datasets: [
      {
        label: "Faturamento diário",
        data: Object.values(faturamentoPorDia),
        backgroundColor: "#9f1d2f",
        borderColor: "#7f1726",
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end" as const,
        align: "top" as const,
        formatter: (value: number) => money(value),
        color: "#514a43",
        font: { weight: "bold" as const },
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            return money(context.raw as number);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (tickValue: string | number) {
            return typeof tickValue === "number" ? money(tickValue) : tickValue;
          },
        },
      },
    },
  };

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Missô Admin</h2>
        <nav style={styles.nav}>
          <AdminLink href="/admin/faturamento" pathname={pathname}>
            Faturamento
          </AdminLink>
          <AdminLink href="/admin/menu" pathname={pathname}>
            Cardápio
          </AdminLink>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Financeiro</p>
            <h1 style={styles.title}>Faturamento</h1>
          </div>
          <span style={styles.statusPill}>
            {loading ? "Carregando" : `${orders.length} pedido(s)`}
          </span>
        </header>

        <div style={styles.metrics}>
          <Metric title="Pedidos" value={orders.length} />
          <Metric title="Faturamento" value={money(faturamentoTotal)} />
          <Metric title="Ticket médio" value={money(ticketMedio)} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Evolução</p>
              <h2 style={styles.cardTitle}>Faturamento diário</h2>
            </div>
          </div>
          {loading ? (
            <p style={styles.muted}>Carregando dados...</p>
          ) : orders.length === 0 ? (
            <p style={styles.muted}>Nenhum pedido encontrado.</p>
          ) : (
            <Bar data={chartDataBar} options={chartOptions} />
          )}
        </div>
      </section>
    </main>
  );
}

function AdminLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        ...styles.navLink,
        ...(active ? styles.navLinkActive : {}),
      }}
    >
      {children}
    </Link>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricTitle}>{title}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
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
  sidebar: {
    borderRight: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffdf8",
    padding: 22,
  },
  sidebarTitle: {
    fontSize: 20,
    marginBottom: 22,
  },
  nav: {
    display: "grid",
    gap: 8,
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
  content: {
    padding: "28px 24px 56px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
    marginBottom: 20,
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
  statusPill: {
    borderRadius: 999,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "10px 13px",
    fontWeight: 850,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  metricTitle: {
    color: "#625b53",
    fontSize: 13,
    fontWeight: 850,
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  cardHeader: {
    marginBottom: 18,
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
  },
  muted: {
    color: "#625b53",
  },
};
