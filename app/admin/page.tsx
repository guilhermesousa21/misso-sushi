"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Order = {
  id: number;
  name: string;
  phone: string;
  address: string;
  items: {
    id: number;
    name: string;
    price: number;
    quantity?: number;
  }[];
  total: number;
  status: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  pendente: "#ef4444",
  preparando: "#f59e0b",
  pronto: "#3b82f6",
  entregue: "#22c55e",
};

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (mounted && data) setOrders(data);
    };

    fetchOrders();

    // 🔥 Realtime (sincroniza outros dispositivos)
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

  // 🚀 ATUALIZAÇÃO OTIMISTA (resolve seu problema)
  async function updateStatus(id: number, status: string) {
    // atualiza no banco
    await supabase.from("orders").update({ status }).eq("id", id);

    // 🔥 atualiza UI na hora (sem refresh)
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  }

  const filtered =
    filter === "todos"
      ? orders
      : orders.filter((o) => o.status === filter);

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>🍣 Cozinha - Missô Sushi</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Painel em tempo real
        </p>
      </header>

      {/* FILTERS */}
      <div style={styles.filters}>
        {["todos", "pendente", "preparando", "pronto", "entregue"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                ...styles.filterBtn,
                background: filter === status ? "#111" : "#fff",
                color: filter === status ? "#fff" : "#111",
                borderColor: filter === status ? "#111" : "#e5e7eb",
              }}
            >
              {status}
            </button>
          )
        )}
      </div>

      {/* GRID */}
      <div style={styles.grid}>
        {filtered.map((order) => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Pedido #{order.id}</h3>
                <p style={styles.subText}>
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <span
                style={{
                  ...styles.badge,
                  background: statusColor[order.status] || "#999",
                }}
              >
                {order.status}
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={styles.text}>
                <strong>Cliente:</strong> {order.name}
              </p>
              <p style={styles.text}>
                <strong>Telefone:</strong> {order.phone}
              </p>
              <p style={styles.text}>
                <strong>Endereço:</strong> {order.address}
              </p>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Itens</strong>
              <div style={{ marginTop: 6 }}>
                {order.items.map((item) => (
                  <div key={item.id} style={styles.itemRow}>
                    <span>
                      {item.name} x{item.quantity ?? 1}
                    </span>
                    <span>
                      R$ {(item.price * (item.quantity ?? 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.total}>
              Total: <strong>R$ {order.total.toFixed(2)}</strong>
            </div>

            <div style={styles.actions}>
              <button
                style={styles.btnYellow}
                onClick={() => updateStatus(order.id, "preparando")}
              >
                Preparando
              </button>

              <button
                style={styles.btnBlue}
                onClick={() => updateStatus(order.id, "pronto")}
              >
                Pronto
              </button>

              <button
                style={styles.btnGreen}
                onClick={() => updateStatus(order.id, "entregue")}
              >
                Entregue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= UI ================= */

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    fontFamily: "Arial",
    background: "#f6f7fb",
    minHeight: "100vh",
  },

  header: {
    marginBottom: 20,
  },

  filters: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  filterBtn: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 500,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },

  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
  },

  subText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  text: {
    margin: "4px 0",
    fontSize: 14,
    color: "#333",
  },

  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    padding: "4px 0",
    borderBottom: "1px dashed #eee",
  },

  total: {
    marginTop: 10,
    fontSize: 16,
  },

  actions: {
    display: "flex",
    gap: 8,
    marginTop: 14,
  },

  btnYellow: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    border: "none",
    background: "#f59e0b",
    color: "#fff",
    cursor: "pointer",
  },

  btnBlue: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
  },

  btnGreen: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    border: "none",
    background: "#22c55e",
    color: "#fff",
    cursor: "pointer",
  },
};