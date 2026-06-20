"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { formatAddonSummary, getKitchenPickupBadge, getMinPickupMinutes, type OperationalSettings } from "../../lib/orderFeatures";
import { formatOrderItemLabel } from "../../lib/itemModifiers";
import { printOrder } from "../../lib/printOrder";
import { supabase } from "../../lib/supabase";
import {
  formatBrasiliaDateTime,
  parseSupabaseDate,
  toBrasiliaDateKey,
} from "../../lib/brasiliaTime";
import { useMediaQuery } from "../../lib/useMediaQuery";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity?: number;
  modifiers?: string[] | null;
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
  | { action: "ready"; order: Order }
  | { action: "picked_up"; order: Order }
  | null;

type KitchenFilter = "recebidos" | "prontos" | "atrasados" | "retirados";

const isOrderPickedUp = (order: Order) =>
  normalizeKitchenStatus(order.status) === "retirado" || order.status === "retirado";

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

const minutesSinceAt = (value: string, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - parseSupabaseDate(value).getTime()) / 60000));

const getQueueLabel = (order: Order, now: Date) => {
  if (order.fulfillment_type === "scheduled" && order.scheduled_for) {
    const pickupTime = parseSupabaseDate(order.scheduled_for);
    const minutesUntil = Math.max(
      0,
      Math.floor((pickupTime.getTime() - now.getTime()) / 60000)
    );

    return minutesUntil > 0 ? `Retirada em ${minutesUntil} min` : "Horário de retirada";
  }

  return `${minutesSinceAt(order.created_at, now)} min na fila`;
};

const isKitchenOrderDelayed = (order: Order, now: Date, delayMinutes: number) => {
  if (normalizeKitchenStatus(order.status) !== "recebido") return false;

  if (order.fulfillment_type === "scheduled" && order.scheduled_for) {
    return parseSupabaseDate(order.scheduled_for).getTime() < now.getTime();
  }

  return minutesSinceAt(order.created_at, now) > delayMinutes;
};

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings | null>(null);
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [now, setNow] = useState(() => new Date());
  const delayMinutes = getMinPickupMinutes(operationalSettings);
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

    async function fetchSettings() {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (mounted && data) {
        setOperationalSettings(data as OperationalSettings);
      }
    }

    void fetchSettings();

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
    }, 60000);

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

  async function markOrderPickedUp(order: Order) {
    if (order.status === "retirado") return;

    const { error } = await supabase.from("orders").update({ status: "retirado" }).eq("id", order.id);
    if (error) {
      window.alert("Não foi possível marcar o pedido como retirado.");
      return;
    }

    setOrders((prev) =>
      prev.map((current) => (current.id === order.id ? { ...current, status: "retirado" } : current))
    );
  }

  async function handleConfirmAction() {
    if (!confirmation) return;

    setConfirming(true);
    try {
      if (confirmation.action === "ready") {
        await markOrderReady(confirmation.order);
      } else {
        await markOrderPickedUp(confirmation.order);
      }
      setConfirmation(null);
    } finally {
      setConfirming(false);
    }
  }

  const todayKey = toBrasiliaDateKey(now);
  const todayOrders = orders.filter(
    (order) => toBrasiliaDateKey(order.created_at) === todayKey
  );
  const queueOrders = todayOrders.filter((order) => !isOrderPickedUp(order));
  const pickedUpOrders = todayOrders.filter(isOrderPickedUp);

  const sortQueueOrders = (items: Order[]) =>
    [...items].sort((a, b) => {
      const aPickup = a.scheduled_for || a.created_at;
      const bPickup = b.scheduled_for || b.created_at;
      return new Date(aPickup).getTime() - new Date(bPickup).getTime();
    });

  const sortPickedUpOrders = (items: Order[]) =>
    [...items].sort(
      (a, b) =>
        parseSupabaseDate(b.created_at).getTime() - parseSupabaseDate(a.created_at).getTime()
    );

  const receivedOrders = queueOrders.filter(
    (order) =>
      normalizeKitchenStatus(order.status) === "recebido" &&
      !isKitchenOrderDelayed(order, now, delayMinutes)
  );
  const readyOrders = queueOrders.filter(
    (order) => normalizeKitchenStatus(order.status) === "pronto"
  );
  const delayedOrders = queueOrders.filter((order) =>
    isKitchenOrderDelayed(order, now, delayMinutes)
  );

  const orderMatchesFilter = (order: Order, filterValue: KitchenFilter | null) => {
    if (!filterValue) return true;

    const kitchenStatus = normalizeKitchenStatus(order.status);
    if (filterValue === "recebidos") {
      return kitchenStatus === "recebido" && !isKitchenOrderDelayed(order, now, delayMinutes);
    }
    if (filterValue === "prontos") return kitchenStatus === "pronto";
    if (filterValue === "retirados") return isOrderPickedUp(order);
    return isKitchenOrderDelayed(order, now, delayMinutes);
  };

  const filteredOrders =
    filter === "retirados"
      ? sortPickedUpOrders(pickedUpOrders)
      : sortQueueOrders(queueOrders).filter((order) => orderMatchesFilter(order, filter));

  const filterEmptyMessages: Record<KitchenFilter, string> = {
    recebidos: "Nenhum pedido recebido no momento.",
    prontos: "Nenhum pedido pronto no momento.",
    atrasados: "Nenhum pedido atrasado no momento.",
    retirados: "Nenhum pedido retirado hoje.",
  };

  const kitchenFilters: {
    key: KitchenFilter;
    label: string;
    count: number;
    alert?: boolean;
    success?: boolean;
    pickedUp?: boolean;
  }[] = [
    { key: "recebidos", label: "Recebidos", count: receivedOrders.length },
    { key: "prontos", label: "Prontos", count: readyOrders.length, success: true },
    {
      key: "atrasados",
      label: "Atrasados",
      count: delayedOrders.length,
      alert: true,
    },
    {
      key: "retirados",
      label: "Retirados",
      count: pickedUpOrders.length,
      pickedUp: true,
    },
  ];

  const showEmptyBoard =
    filter === "retirados"
      ? pickedUpOrders.length === 0
      : filter
        ? filteredOrders.length === 0
        : queueOrders.length === 0;

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
                    ...(item.pickedUp ? styles.headerStatPickedUp : {}),
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

      {showEmptyBoard ? (
        <section style={styles.emptyState}>
          <h2>
            {filter
              ? filterEmptyMessages[filter]
              : "Nenhum pedido na cozinha hoje."}
          </h2>
        </section>
      ) : (
        <section style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
          {filteredOrders.map((order) => (
            (() => {
              const kitchenStatus = normalizeKitchenStatus(order.status);
              const pickupBadge = getKitchenPickupBadge(order);
              const queueLabel = getQueueLabel(order, now);
              const delayed = isKitchenOrderDelayed(order, now, delayMinutes);

              return (
            <article
              key={order.id}
              style={{
                ...styles.card,
                ...(delayed ? styles.cardDelayed : {}),
              }}
            >
              <div style={{ ...styles.cardHeader, ...(isMobile ? styles.cardHeaderMobile : {}) }}>
                <div style={styles.cardHeaderMain}>
                  <p style={styles.orderId}>Pedido #{order.id}</p>
                  <p style={styles.time}>
                    {formatBrasiliaDateTime(order.created_at)}
                  </p>
                  <div
                    style={{
                      ...styles.pickupBadge,
                      ...(pickupBadge.variant === "scheduled"
                        ? styles.pickupBadgeScheduled
                        : styles.pickupBadgeAsap),
                    }}
                  >
                    {pickupBadge.label}
                  </div>
                  <p style={{ ...styles.queueTime, ...(delayed ? styles.queueTimeDelayed : {}) }}>
                    {queueLabel}
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
                      <span style={styles.itemName}>{formatOrderItemLabel(item)}</span>
                      <strong style={styles.itemPrice}>
                        {money(item.price * (item.quantity ?? 1))}
                      </strong>
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
                <button
                  type="button"
                  style={{
                    ...styles.actionStatusButton,
                    ...(kitchenStatus === "retirado"
                      ? styles.actionMarkReadyDone
                      : kitchenStatus === "pronto"
                        ? styles.actionMarkReadyDone
                        : styles.actionMarkReady),
                  }}
                  onClick={() => setConfirmation({ action: "ready", order })}
                  disabled={kitchenStatus === "pronto" || kitchenStatus === "retirado"}
                >
                  {kitchenStatus === "pronto" || kitchenStatus === "retirado" ? "Pronto" : "Marcar pronto"}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.actionStatusButton,
                    ...(kitchenStatus === "retirado"
                      ? styles.actionPickedUpDone
                      : kitchenStatus === "pronto"
                        ? styles.actionPickedUp
                        : styles.actionPickedUpDisabled),
                  }}
                  onClick={() => setConfirmation({ action: "picked_up", order })}
                  disabled={kitchenStatus !== "pronto"}
                >
                  {kitchenStatus === "retirado" ? "Retirado" : "Marcar retirado"}
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
                {confirmation.action === "ready" ? "✓" : "↗"}
              </span>
              <div>
                <p style={styles.confirmEyebrow}>
                  {confirmation.action === "ready" ? "Aviso ao cliente" : "Finalizar pedido"}
                </p>
                <h2 id="confirm-title" style={styles.confirmTitle}>
                  {confirmation.action === "ready"
                    ? `Marcar pedido #${confirmation.order.id} como pronto?`
                    : `Marcar pedido #${confirmation.order.id} como retirado?`}
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

            {confirmation.action === "picked_up" && (
              <p style={styles.confirmNote}>
                O pedido sairá da fila da cozinha e ficará registrado como retirado pelo cliente.
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
                    : "Confirmar retirado"}
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
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    minWidth: 480,
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
  headerStatPickedUp: {
    background: "#3730a3",
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
  cardHeaderMain: {
    minWidth: 0,
    display: "grid",
    gap: 2,
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
  pickupBadge: {
    marginTop: 10,
    width: "fit-content",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 850,
    lineHeight: 1.25,
  },
  pickupBadgeAsap: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  pickupBadgeScheduled: {
    background: "#3730a3",
    color: "#fffdf8",
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
  itemsBox: {
    marginTop: 16,
    display: "grid",
    gap: 10,
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 14,
    padding: "4px 0",
    borderBottom: "1px dashed rgba(28, 26, 23, 0.16)",
  },
  itemName: {
    fontSize: 17,
    fontWeight: 850,
    lineHeight: 1.35,
    color: "#1c1a17",
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 850,
    whiteSpace: "nowrap",
    color: "#514a43",
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
  actionStatusButton: {
    border: "none",
    borderRadius: 999,
    color: "#fff",
    padding: 12,
    cursor: "pointer",
    fontWeight: 850,
    minHeight: 52,
    whiteSpace: "nowrap",
  },
  actionMarkReady: {
    background: "#16a34a",
    boxShadow: "0 8px 18px rgba(22, 163, 74, 0.24)",
  },
  actionMarkReadyDone: {
    background: "#16a34a",
    color: "#fff",
    cursor: "not-allowed",
    boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.28)",
  },
  actionPickedUp: {
    background: "#3730a3",
  },
  actionPickedUpDone: {
    background: "#e0e7ff",
    color: "#3730a3",
    cursor: "not-allowed",
  },
  actionPickedUpDisabled: {
    background: "#e0e7ff",
    color: "#6366f1",
    cursor: "not-allowed",
    opacity: 0.72,
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
