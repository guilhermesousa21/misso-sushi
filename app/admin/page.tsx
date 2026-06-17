"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useMediaQuery } from "../../lib/useMediaQuery";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  formatDateTime,
  money,
  number,
  type AdminOrder,
} from "./AdminShell";

const statusLabels: Record<string, string> = {
  recebido: "Recebidos",
  preparando: "Em preparo",
  pronto: "Prontos",
  retirado: "Retirados",
};

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
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
          (data || []).map((order) => ({
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

    const channel = supabase
      .channel("admin-overview-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const metrics = useMemo(() => {
    const todayKey = new Date().toDateString();
    const todayOrders = orders.filter(
      (order) => new Date(order.created_at).toDateString() === todayKey
    );
    const activeOrders = orders.filter(
      (order) => !["pronto", "retirado"].includes(order.status || "")
    );
    const todayRevenue = todayOrders.reduce((sum, order) => sum + calcTotal(order), 0);
    const averageTicket =
      todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const statusTotals = orders.reduce((acc, order) => {
      const status = order.status || "recebido";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeOrders,
      averageTicket,
      statusTotals,
      todayOrders,
      todayRevenue,
    };
  }, [orders]);

  return (
    <AdminShell
      eyebrow="Painel"
      title="Visao geral"
      action={
        <Link href="/cozinha" style={styles.primaryLink}>
          Abrir cozinha
        </Link>
      }
    >
      <section style={styles.metrics}>
        <Metric label="Pedidos hoje" value={number(metrics.todayOrders.length)} detail="Entradas do dia" />
        <Metric label="Faturamento hoje" value={money(metrics.todayRevenue)} detail="Total registrado" />
        <Metric label="Pedidos ativos" value={number(metrics.activeOrders.length)} detail="Recebidos ou em preparo" />
        <Metric label="Ticket medio" value={money(metrics.averageTicket)} detail="Media dos pedidos de hoje" />
      </section>

      <section style={{ ...styles.grid, ...(isTablet ? styles.gridStack : {}) }}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Operacao</p>
              <h2 style={styles.cardTitle}>Fila recente</h2>
            </div>
            <span style={styles.pill}>{loading ? "Carregando" : `${orders.length} pedido(s)`}</span>
          </div>

          {orders.slice(0, 8).map((order) => (
            <div key={order.id} style={styles.row}>
              <div>
                <strong>#{order.id} - {order.name || "Cliente"}</strong>
                <p style={styles.mutedSmall}>
                  {formatDateTime(order.created_at)} - {order.status || "recebido"}
                </p>
              </div>
              <strong>{money(calcTotal(order))}</strong>
            </div>
          ))}
          {!loading && orders.length === 0 && (
            <EmptyState text="Nenhum pedido registrado ainda." />
          )}
        </article>

        <aside style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Status</p>
              <h2 style={styles.cardTitle}>Resumo da fila</h2>
            </div>
          </div>

          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} style={styles.row}>
              <span>{label}</span>
              <strong>{number(metrics.statusTotals[status] || 0)}</strong>
            </div>
          ))}
        </aside>
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
