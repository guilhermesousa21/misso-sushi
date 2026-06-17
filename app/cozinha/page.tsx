"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { printOrder } from "../../lib/printOrder";
import { supabase } from "../../lib/supabase";
import { useMediaQuery } from "../../lib/useMediaQuery";

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
  subtotal?: number;
  discount_amount?: number;
  coupon_code?: string;
  status: string;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
};

const statuses = ["todos", "recebido", "entregue", "retirado"];

const statusStyle: Record<string, CSSProperties> = {
  recebido: { background: "#fee2e2", color: "#991b1b" },
  entregue: { background: "#dcfce7", color: "#166534" },
  retirado: { background: "#e0e7ff", color: "#3730a3" },
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

const paymentLabel = (order: Order) => {
  const status = order.payment_status || "pendente";
  if (!order.payment_method) return `Pagamento: ${status}`;
  return `Pagamento: ${order.payment_method.toUpperCase()} - ${status}`;
};

const minutesSince = (value: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));

const playNotification = () => {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.18);
};

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [filter, setFilter] = useState("todos");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousOrderIds = useRef<Set<number>>(new Set());

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

        const nextIds = new Set(safeData.map((order) => order.id));
        const newOrders = safeData.filter(
          (order) => !previousOrderIds.current.has(order.id)
        );
        const hasNewOrder =
          previousOrderIds.current.size > 0 &&
          newOrders.length > 0;
        previousOrderIds.current = nextIds;

        if (hasNewOrder && soundEnabled) {
          playNotification();
        }
        if (hasNewOrder) {
          newOrders.forEach((order) => printOrder(order));
        }

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
  }, [soundEnabled]);

  async function updateStatus(id: number, status: string) {
    if (status === "retirado") {
      const confirm = window.confirm("Finalizar este pedido como retirado?");
      if (!confirm) return;
    }

    if (status === "recebido") {
      const confirm = window.confirm("Reverter este pedido para recebido?");
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
    const aDone = ["entregue", "retirado"].includes(a.status);
    const bDone = ["entregue", "retirado"].includes(b.status);
    if (aDone && !bDone) return 1;
    if (bDone && !aDone) return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const activeOrders = orders.filter(
    (order) => !["entregue", "retirado"].includes(order.status)
  );

  return (
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <div>
          <p style={styles.eyebrow}>Painel em tempo real</p>
          <h1 style={styles.title}>Cozinha</h1>
        </div>
        <div style={styles.headerStat}>
          <span>Pedidos ativos</span>
          <strong>{activeOrders.length}</strong>
        </div>
      </header>

      <nav style={styles.filters} aria-label="Filtrar pedidos">
        <button
          type="button"
          onClick={() => {
            setSoundEnabled(true);
            playNotification();
          }}
          style={{ ...styles.filterBtn, ...(soundEnabled ? styles.filterBtnActive : {}) }}
        >
          Som {soundEnabled ? "ativo" : "ativar"}
        </button>
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
        <section style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
          {sorted.map((order) => (
            <article
              key={order.id}
              style={{
                ...styles.card,
                ...(minutesSince(order.created_at) > 35 &&
                !["entregue", "retirado"].includes(order.status)
                  ? styles.cardDelayed
                  : {}),
              }}
            >
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.orderId}>Pedido #{order.id}</p>
                  <p style={styles.time}>
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p style={styles.time}>{minutesSince(order.created_at)} min na fila</p>
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
                <span>Retirada no balcão</span>
                <span>{paymentLabel(order)}</span>
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

              <div style={{ ...styles.actions, ...(isMobile ? styles.actionsMobile : {}) }}>
                <button
                  type="button"
                  style={styles.actionSecondary}
                  onClick={() => printOrder(order)}
                >
                  Imprimir
                </button>
                {order.status === "retirado" ? (
                  <button
                    type="button"
                    style={styles.actionSecondary}
                    onClick={() => updateStatus(order.id, "recebido")}
                  >
                    Reverter
                  </button>
                ) : (
                  <button
                    type="button"
                    style={styles.actionPrimary}
                    onClick={() => updateStatus(order.id, "retirado")}
                  >
                    Finalizar
                  </button>
                )}
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
  pageMobile: {
    padding: "22px 14px 42px",
  },
  header: {
    maxWidth: 1180,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
  },
  headerMobile: {
    display: "grid",
    alignItems: "start",
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
  gridMobile: {
    gridTemplateColumns: "1fr",
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)",
  },
  cardDelayed: {
    borderColor: "rgba(153, 27, 27, 0.28)",
    boxShadow: "0 14px 35px rgba(153, 27, 27, 0.12)",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
  },
  actionsMobile: {
    gridTemplateColumns: "1fr",
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
