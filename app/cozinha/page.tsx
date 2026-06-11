"use client";

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
  note?: string; // <-- novo campo
  total?: number;
  status: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  recebido: "#ef4444",
  preparando: "#f59e0b",
  pronto: "#3b82f6",
};

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
      prev.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  }

  const filtered =
    filter === "todos"
      ? orders
      : orders.filter((o) => o.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "pronto" && b.status !== "pronto") return 1;
    if (b.status === "pronto" && a.status !== "pronto") return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>🍣 Cozinha - Missô Sushi</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Painel em tempo real</p>
      </header>

      <div style={styles.filters}>
        {["todos", "recebido", "preparando", "pronto"].map((status) => {
          const count =
            status === "todos"
              ? orders.length
              : orders.filter((o) => o.status === status).length;

          return (
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
              {status} ({count})
            </button>
          );
        })}
      </div>

      <div style={styles.grid}>
        {sorted.map((order) => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardInfo}>
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
              {order.note && (
                <p style={styles.text}>
                  <strong>Observação:</strong> {order.note}
                </p>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Itens</strong>
              <div style={{ marginTop: 6 }}>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      style={styles.itemRow}
                    >
                      <span>
                        {item.name} x{item.quantity ?? 1}
                      </span>
                      <span>
                        R$ {(item.price * (item.quantity ?? 1)).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={styles.subText}>Nenhum item neste pedido</p>
                )}
              </div>
            </div>

            <div style={styles.total}>
              Total: <strong>R$ {calcTotal(order.items).toFixed(2)}</strong>
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
  header: { marginBottom: 20 },
  filters: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    minHeight: 250,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    width: 100,
    textAlign: "center",
    flexShrink: 0,
  },
  subText: { fontSize: 12, color: "#666", marginTop: 4 },
  text: { margin: "4px 0", fontSize: 14, color: "#333" },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    padding: "4px 0",
    borderBottom: "1px dashed #eee",
  },
  total: { marginTop: 10, fontSize: 16 },
  actions: { display: "flex", gap: 8, marginTop: 14 },
  btnYellow: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#f59e0b",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  btnBlue: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
};
