"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatAddonSummary, getOrderPickupLabel } from "../../lib/orderFeatures";
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
  fulfillment_type?: string;
  scheduled_for?: string;
  addons?: { id: string; name: string; quantity: number; unit_price?: number | null }[];
  service_fee?: number;
  service_fee_label?: string;
};

type ConfirmationState =
  | { action: "print"; order: Order }
  | { action: "ready"; order: Order }
  | null;

type KitchenFilter = "recebidos" | "prontos" | "atrasados";

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  pronto: "Pronto",
  retirado: "Retirado",
};

const statusStyle: Record<string, CSSProperties> = {
  recebido: { background: "#fee2e2", color: "#991b1b" },
  pronto: { background: "#dcfce7", color: "#166534" },
  retirado: { background: "#e0e7ff", color: "#3730a3" },
};

const normalizeKitchenStatus = (status?: string) =>
  status === "preparando" ? "recebido" : status || "recebido";

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

const parseSupabaseDate = (value: string) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

const minutesSinceAt = (value: string, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - parseSupabaseDate(value).getTime()) / 60000));

const isKitchenOrderDelayed = (order: Order, now: Date) =>
  normalizeKitchenStatus(order.status) === "recebido" &&
  minutesSinceAt(order.created_at, now) > 35;

const formatBrasiliaDateTime = (value: string) =>
  parseSupabaseDate(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const toBrasiliaDateKey = (value: string | Date) => {
  const date = typeof value === "string" ? parseSupabaseDate(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [now, setNow] = useState(() => new Date());
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState<KitchenFilter | null>(null);
  const previousOrderIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "pago")
        .order("created_at", { ascending: true });

      if (mounted && data) {
        const safeData: Order[] = data
          .filter((order: Order) => order.payment_status === "pago")
          .map((order: Order) => ({
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
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  async function markOrderReady(order: Order) {
    if (normalizeKitchenStatus(order.status) === "pronto") return;

    const { error } = await supabase.from("orders").update({ status: "pronto" }).eq("id", order.id);
    if (error) {
      window.alert("Não foi possível marcar o pedido como pronto.");
      return;
    }

    setOrders((prev) =>
      prev.map((current) => (current.id === order.id ? { ...current, status: "pronto" } : current))
    );

    const response = await fetch("/api/whatsapp/customer-ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, status: "pronto" }),
    }).catch(() => null);

    const result = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || result?.ok === false) {
      window.alert(result?.error || "Pedido marcado como pronto, mas não foi possível enviar o WhatsApp ao cliente.");
    }
  }

  async function handleConfirmAction() {
    if (!confirmation) return;

    setConfirming(true);
    try {
      if (confirmation.action === "print") {
        printOrder(confirmation.order);
      } else {
        await markOrderReady(confirmation.order);
      }
      setConfirmation(null);
    } finally {
      setConfirming(false);
    }
  }

  const todayKey = toBrasiliaDateKey(now);
  const visibleOrders = orders.filter(
    (order) => toBrasiliaDateKey(order.created_at) === todayKey
  );

  const sorted = [...visibleOrders].sort((a, b) => {
    const aDone = ["retirado"].includes(a.status);
    const bDone = ["retirado"].includes(b.status);
    if (aDone && !bDone) return 1;
    if (bDone && !aDone) return -1;
    const aPickup = a.scheduled_for || a.created_at;
    const bPickup = b.scheduled_for || b.created_at;
    return new Date(aPickup).getTime() - new Date(bPickup).getTime();
  });

  const activeOrders = visibleOrders.filter(
    (order) => !["retirado"].includes(order.status)
  );
  const receivedOrders = activeOrders.filter(
    (order) =>
      normalizeKitchenStatus(order.status) === "recebido" &&
      !isKitchenOrderDelayed(order, now)
  );
  const readyOrders = activeOrders.filter(
    (order) => normalizeKitchenStatus(order.status) === "pronto"
  );
  const delayedOrders = activeOrders.filter((order) => isKitchenOrderDelayed(order, now));

  const orderMatchesFilter = (order: Order, filterValue: KitchenFilter | null) => {
    if (!filterValue) return true;

    const kitchenStatus = normalizeKitchenStatus(order.status);
    if (filterValue === "recebidos") {
      return kitchenStatus === "recebido" && !isKitchenOrderDelayed(order, now);
    }
    if (filterValue === "prontos") return kitchenStatus === "pronto";
    return isKitchenOrderDelayed(order, now);
  };

  const filteredOrders = sorted.filter((order) => orderMatchesFilter(order, filter));

  const filterEmptyMessages: Record<KitchenFilter, string> = {
    recebidos: "Nenhum pedido recebido no momento.",
    prontos: "Nenhum pedido pronto no momento.",
    atrasados: "Nenhum pedido atrasado no momento.",
  };

  const kitchenFilters: {
    key: KitchenFilter;
    label: string;
    count: number;
    alert?: boolean;
    success?: boolean;
  }[] = [
    { key: "recebidos", label: "Recebidos", count: receivedOrders.length },
    { key: "prontos", label: "Prontos", count: readyOrders.length, success: true },
    {
      key: "atrasados",
      label: "Atrasados",
      count: delayedOrders.length,
      alert: delayedOrders.length > 0,
    },
  ];

  return (
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <div>
          <p style={styles.eyebrow}>Painel em tempo real</p>
          <h1 style={styles.title}>Cozinha</h1>
        </div>
        <div style={{ ...styles.headerSide, ...(isMobile ? styles.headerSideMobile : {}) }}>
          <div style={{ ...styles.headerStats, ...(isMobile ? styles.headerStatsMobile : {}) }}>
            {kitchenFilters.map((item) => {
              const isActive = filter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={isActive}
                  style={{
                    ...styles.headerStatButton,
                    ...(item.success ? styles.headerStatSuccess : {}),
                    ...(item.alert ? styles.headerStatAlert : {}),
                    ...(isActive ? styles.headerStatActive : styles.headerStatInactive),
                  }}
                  onClick={() =>
                    setFilter((current) => (current === item.key ? null : item.key))
                  }
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {visibleOrders.length === 0 ? (
        <section style={styles.emptyState}>
          <h2>Nenhum pedido na cozinha hoje.</h2>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section style={styles.emptyState}>
          <h2>{filter ? filterEmptyMessages[filter] : "Nenhum pedido encontrado."}</h2>
        </section>
      ) : (
        <section style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
          {filteredOrders.map((order) => (
            (() => {
              const kitchenStatus = normalizeKitchenStatus(order.status);
              const minutesInQueue = minutesSinceAt(order.created_at, now);
              const delayed = isKitchenOrderDelayed(order, now);

              return (
            <article
              key={order.id}
              style={{
                ...styles.card,
                ...(delayed ? styles.cardDelayed : {}),
              }}
            >
              <div style={{ ...styles.cardHeader, ...(isMobile ? styles.cardHeaderMobile : {}) }}>
                <div>
                  <p style={styles.orderId}>Pedido #{order.id}</p>
                  <p style={styles.time}>
                    {formatBrasiliaDateTime(order.created_at)}
                  </p>
                  <p style={{ ...styles.queueTime, ...(delayed ? styles.queueTimeDelayed : {}) }}>
                    {minutesInQueue} min na fila
                  </p>
                </div>
                <div style={styles.badgeStack}>
                  <span
                    style={{
                      ...styles.badge,
                      ...(statusStyle[kitchenStatus] || {}),
                    }}
                  >
                    {statusLabels[kitchenStatus] || kitchenStatus}
                  </span>
                  <span style={styles.paymentBadge}>Pago</span>
                </div>
              </div>

              <div style={styles.customerBox}>
                <strong>{order.name || "Cliente"}</strong>
                <span>{order.phone || "Telefone não informado"}</span>
                <span style={styles.fulfillmentBadge}>{getOrderPickupLabel(order)}</span>
                {formatAddonSummary(order.addons) && (
                  <p>Complementos: {formatAddonSummary(order.addons)}</p>
                )}
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
                <Link href={`/pedido/${order.id}`} style={styles.actionDetails}>
                  Ver detalhes
                </Link>
                <button
                  type="button"
                  style={styles.actionSecondary}
                  onClick={() => setConfirmation({ action: "print", order })}
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.actionPrimary,
                    ...(kitchenStatus === "pronto" ? styles.actionReady : {}),
                  }}
                  onClick={() => setConfirmation({ action: "ready", order })}
                  disabled={kitchenStatus === "pronto"}
                >
                  {kitchenStatus === "pronto" ? "Pedido pronto" : "Pedido pronto"}
                </button>
              </div>
            </article>
              );
            })()
          ))}
        </section>
      )}

      {confirmation && (
        <div
          style={styles.modalOverlay}
          role="presentation"
          onClick={() => !confirming && setConfirmation(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            style={{ ...styles.confirmModal, ...(isMobile ? styles.confirmModalMobile : {}) }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.confirmHeader}>
              <span style={styles.confirmIcon}>
                {confirmation.action === "ready" ? "✓" : "•"}
              </span>
              <div>
                <p style={styles.confirmEyebrow}>
                  {confirmation.action === "ready" ? "Aviso ao cliente" : "Impressão"}
                </p>
                <h2 id="confirm-title" style={styles.confirmTitle}>
                  {confirmation.action === "ready"
                    ? `Marcar pedido #${confirmation.order.id} como pronto?`
                    : `Imprimir pedido #${confirmation.order.id}?`}
                </h2>
              </div>
            </div>

            <div style={styles.confirmBody}>
              <div style={styles.confirmRow}>
                <span>Cliente</span>
                <strong>{confirmation.order.name || "Cliente"}</strong>
              </div>
              <div style={styles.confirmRow}>
                <span>Telefone</span>
                <strong>{confirmation.order.phone || "Não informado"}</strong>
              </div>
              <div style={styles.confirmRow}>
                <span>Total</span>
                <strong>{money(confirmation.order.total ?? calcTotal(confirmation.order.items))}</strong>
              </div>
            </div>

            {confirmation.action === "ready" && (
              <p style={styles.confirmNote}>
                O pedido será marcado como pronto e o cliente receberá uma mensagem automática no WhatsApp.
              </p>
            )}

            <div style={styles.confirmActions}>
              <button
                type="button"
                style={styles.confirmCancel}
                onClick={() => setConfirmation(null)}
                disabled={confirming}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={styles.confirmPrimary}
                onClick={handleConfirmAction}
                disabled={confirming}
              >
                {confirming
                  ? "Processando..."
                  : confirmation.action === "ready"
                    ? "Confirmar pronto"
                    : "Confirmar impressão"}
              </button>
            </div>
          </section>
        </div>
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
    padding: "18px 12px 42px",
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
    gap: 12,
  },
  headerSide: {
    display: "grid",
    gap: 10,
    justifyItems: "end",
  },
  headerSideMobile: {
    width: "100%",
    justifyItems: "stretch",
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
  headerStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    minWidth: 360,
  },
  headerStatsMobile: {
    width: "100%",
    minWidth: 0,
  },
  headerStatButton: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: "12px 14px",
    display: "grid",
    gap: 4,
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
  },
  headerStatInactive: {
    opacity: 0.72,
  },
  headerStatActive: {
    opacity: 1,
    boxShadow: "inset 0 0 0 2px #fffdf8",
    transform: "translateY(-1px)",
  },
  headerStatAlert: {
    background: "#991b1b",
  },
  headerStatSuccess: {
    background: "#15803d",
  },
  grid: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
    gap: 14,
  },
  gridMobile: {
    gridTemplateColumns: "1fr",
  },
  card: {
    background: "#fffdf8",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 20,
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
  cardHeaderMobile: {
    display: "grid",
    gap: 10,
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
  queueTime: {
    marginTop: 7,
    color: "#514a43",
    fontSize: 14,
    fontWeight: 850,
  },
  queueTimeDelayed: {
    color: "#991b1b",
  },
  badgeStack: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badge: {
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  paymentBadge: {
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
    background: "#ecfdf5",
    color: "#0f7a4a",
  },
  customerBox: {
    marginTop: 16,
    display: "grid",
    gap: 4,
    color: "#514a43",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    paddingTop: 14,
  },
  fulfillmentBadge: {
    width: "fit-content",
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "5px 8px",
    fontSize: 12,
    fontWeight: 850,
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
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    paddingTop: 14,
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
    minHeight: 52,
    whiteSpace: "nowrap",
  },
  actionDetails: {
    border: "none",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: 12,
    cursor: "pointer",
    fontWeight: 850,
    minHeight: 52,
    whiteSpace: "nowrap",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px rgba(28, 26, 23, 0.12)",
  },
  actionPrimary: {
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: 12,
    cursor: "pointer",
    fontWeight: 850,
    minHeight: 52,
    whiteSpace: "nowrap",
  },
  actionReady: {
    background: "#15803d",
    color: "#fff",
    cursor: "not-allowed",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    background: "rgba(28, 26, 23, 0.48)",
    display: "grid",
    placeItems: "center",
    padding: 18,
  },
  confirmModal: {
    width: "min(100%, 460px)",
    background: "#fffdf8",
    borderRadius: 8,
    border: "1px solid rgba(28, 26, 23, 0.12)",
    boxShadow: "0 30px 80px rgba(28, 26, 23, 0.28)",
    padding: 22,
  },
  confirmModalMobile: {
    padding: 18,
  },
  confirmHeader: {
    display: "flex",
    gap: 14,
    alignItems: "start",
  },
  confirmIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 900,
    flex: "0 0 auto",
  },
  confirmEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  confirmTitle: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 1.05,
  },
  confirmBody: {
    marginTop: 18,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "10px 0",
    display: "grid",
    gap: 2,
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0",
    color: "#625b53",
  },
  confirmNote: {
    marginTop: 14,
    color: "#514a43",
    lineHeight: 1.45,
  },
  confirmActions: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  confirmCancel: {
    border: "none",
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#1c1a17",
    padding: "13px 14px",
    cursor: "pointer",
    fontWeight: 850,
  },
  confirmPrimary: {
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "13px 14px",
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
