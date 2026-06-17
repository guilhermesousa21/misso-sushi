"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  formatDateTime,
  money,
  normalize,
  number,
  type AdminOrder,
} from "../AdminShell";

const statuses = ["todos", "recebido", "preparando", "pronto", "retirado"];

const statusLabels: Record<string, string> = {
  todos: "Todos",
  recebido: "Recebido",
  preparando: "Preparando",
  pronto: "Pronto",
  retirado: "Retirado",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
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
      .channel("admin-orders-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = normalize(search.trim());

    return orders.filter((order) => {
      const byStatus = status === "todos" || (order.status || "recebido") === status;
      const bySearch =
        !query ||
        normalize(String(order.id)).includes(query) ||
        normalize(order.name || "").includes(query) ||
        normalize(order.phone || "").includes(query);

      return byStatus && bySearch;
    });
  }, [orders, search, status]);

  async function updateStatus(orderId: number | string, nextStatus: string) {
    await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );
  }

  return (
    <AdminShell
      eyebrow="Atendimento"
      title="Pedidos"
      action={<span style={styles.pill}>{loading ? "Carregando" : `${number(filteredOrders.length)} pedido(s)`}</span>}
    >
      <section style={{ ...styles.toolbar, ...(isTablet ? styles.toolbarStack : {}) }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar pedido, cliente ou telefone"
          style={styles.input}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={styles.select}
        >
          {statuses.map((option) => (
            <option key={option} value={option}>
              {statusLabels[option]}
            </option>
          ))}
        </select>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.cardEyebrow}>Historico</p>
            <h2 style={styles.cardTitle}>Lista de pedidos</h2>
          </div>
        </div>

        {filteredOrders.map((order) => (
          <article key={order.id} style={localStyles.orderCard}>
            <div style={localStyles.orderHeader}>
              <div>
                <strong>Pedido #{order.id}</strong>
                <p style={styles.mutedSmall}>
                  {order.name || "Cliente"} - {order.phone || "Sem telefone"}
                </p>
                <p style={styles.mutedSmall}>{formatDateTime(order.created_at)}</p>
              </div>
              <strong>{money(calcTotal(order))}</strong>
            </div>

            <div style={localStyles.itemList}>
              {(order.items || []).map((item, index) => (
                <span key={`${order.id}-${item.id}-${index}`} style={localStyles.itemPill}>
                  {item.quantity ?? 1}x {item.name}
                </span>
              ))}
              {(order.items || []).length === 0 && (
                <span style={styles.mutedSmall}>Sem itens salvos neste pedido.</span>
              )}
            </div>

            {order.note && <p style={localStyles.note}>Obs: {order.note}</p>}

            <div style={localStyles.statusBar}>
              <button
                type="button"
                onClick={() => window.print()}
                style={localStyles.statusButton}
              >
                Imprimir
              </button>
              {statuses.slice(1).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateStatus(order.id, option)}
                  style={{
                    ...localStyles.statusButton,
                    ...((order.status || "recebido") === option
                      ? localStyles.statusButtonActive
                      : {}),
                  }}
                >
                  {statusLabels[option]}
                </button>
              ))}
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
  orderCard: {
    padding: "16px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 14,
  },
  itemList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  itemPill: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "7px 10px",
    fontSize: 13,
    fontWeight: 800,
  },
  note: {
    marginTop: 12,
    color: "#625b53",
    lineHeight: 1.45,
  },
  statusBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  statusButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: 850,
  },
  statusButtonActive: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderColor: "#1c1a17",
  },
};
