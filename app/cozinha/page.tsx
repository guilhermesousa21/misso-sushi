"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity?: number;
};

type Order = {
  id: number;
  name: string;
  phone: string;
  items: OrderItem[];
  note?: string;
  total?: number;
  status: string;
  created_at: string;
};

const statuses = ["todos", "recebido", "preparando", "pronto"];

const statusStyle: Record<string, CSSProperties> = {
  recebido: { background: "#fee2e2", color: "#991b1b" },
  preparando: { background: "#fef3c7", color: "#92400e" },
  pronto: { background: "#dbeafe", color: "#1e40af" },
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const calcTotal = (items: OrderItem[]) =>
  (items || []).reduce(
    (sum, item) => sum + item.price * (item.quantity ?? 1),
    0
  );

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: true });

      if (mounted && data) {
        const safeData: Order[] = data.map((order: Order) => ({
          ...order,
          items: Array.isArray(order.items) ? order.items : [],
        }));
        setOrders(safeData);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(id: number, status: string) {
    if (status === "pronto") {
      const confirm = window.confirm("Confirmar que o pedido está pronto?");
      if (!confirm) return;
    }

    await supabase.from("orders").update({ status }).eq("id", id);

    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status } : order))
    );
  }

  const filtered =
    filter === "todos" ? orders : orders.filter((order) => order.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "pronto" && b.status !== "pronto") return 1;
    if (b.status === "pronto" && a.status !== "pronto") return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Painel em tempo real</p>
          <h1 style={styles.title}>Cozinha</h1>
        </div>
        <div style={styles.headerStat}>
          <span>Pedidos ativos</span>
          <strong>{orders.filter((order) => order.status !== "pronto").length}</strong>
        </div>
      </header>

      <nav style={styles.filters} aria-label="Filtrar pedidos">
        {statuses.map((status) => {
          const count =
            status === "todos"
              ? orders.length
              : orders.filter((order) => order.status === status).length;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              style={{
                ...styles.filterBtn,
                ...(filter === status ? styles.filterBtnActive : {}),
              }}
            >
              {status} <span style={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </nav>

      {sorted.length === 0 ? (
        <section style={styles.emptyState}>
          <h2>Nenhum pedido nesta fila</h2>
          <p>A lista atualiza automaticamente quando um pedido chegar.</p>
        </section>
      ) : (
        <section style={styles.grid}>
          {sorted.map((order) => (
            <article key={order.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.orderId}>Pedido #{order.id}</p>
                  <p style={styles.time}>
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    ...(statusStyle[order.status] || {}),
                  }}
                >
                  {order.status}
                </span>
              </div>

              <div style={styles.customerBox}>
                <strong>{order.name || "Cliente"}</strong>
                <span>{order.phone || "Telefone não informado"}</span>
                {order.note && <p>Obs: {order.note}</p>}
              </div>

              <div style={styles.itemsBox}>
                <strong>Itens</strong>
                {order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={styles.itemRow}>
                      <span>
                        {item.quantity ?? 1}x {item.name}
                      </span>
                      <strong>{money(item.price * (item.quantity ?? 1))}</strong>
                    </div>
                  ))
                ) : (
                  <p style={styles.muted}>Nenhum item neste pedido.</p>
                )}
              </div>

              <div style={styles.total}>
                <span>Total</span>
                <strong>{money(order.total ?? calcTotal(order.items))}</strong>
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.actionSecondary}
                  onClick={() => updateStatus(order.id, "preparando")}
                >
                  Preparando
                </button>
                <button
                  type="button"
                  style={styles.actionPrimary}
                  onClick={() => updateStatus(order.id, "pronto")}
                >
                  Pronto
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "28px 20px 56px",
  },
  header: {
    maxWidth: 1180,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
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
  headerStat: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: "14px 18px",
    display: "grid",
    gap: 4,
    minWidth: 150,
  },
  filters: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  filterBtn: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#514a43",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
    textTransform: "capitalize",
  },
  filterBtnActive: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderColor: "#1c1a17",
  },
  filterCount: {
    marginLeft: 6,
    opacity: 0.72,
  },
  grid: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
  },
  orderId: {
    fontSize: 20,
    fontWeight: 850,
  },
  time: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
  },
  badge: {
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  customerBox: {
    marginTop: 16,
    display: "grid",
    gap: 4,
    color: "#514a43",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    paddingTop: 14,
  },
  itemsBox: {
    marginTop: 16,
    display: "grid",
    gap: 8,
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: "7px 0",
    borderBottom: "1px dashed rgba(28, 26, 23, 0.16)",
    fontSize: 14,
  },
  muted: {
    color: "#766e64",
  },
  total: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 18,
  },
  actions: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  actionSecondary: {
    border: "none",
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#1c1a17",
    padding: 12,
    cursor: "pointer",
    fontWeight: 850,
  },
  actionPrimary: {
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: 12,
    cursor: "pointer",
    fontWeight: 850,
  },
  emptyState: {
    maxWidth: 1180,
    margin: "0 auto",
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 28,
    color: "#625b53",
  },
};
