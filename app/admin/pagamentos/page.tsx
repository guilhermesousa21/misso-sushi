"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  formatDateTime,
  money,
  number,
  type AdminOrder,
} from "../AdminShell";

const paymentStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  falhou: "Falhou",
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    async function loadOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setOrders(
          data.map((order) => ({
            ...(order as AdminOrder),
            items: Array.isArray((order as AdminOrder).items)
              ? (order as AdminOrder).items
              : [],
          }))
        );
      }
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(
    () =>
      filter === "todos"
        ? orders
        : orders.filter((order) => (order.payment_status || "pendente") === filter),
    [filter, orders]
  );

  const paidTotal = filteredOrders
    .filter((order) => (order.payment_status || "pendente") === "pago")
    .reduce((sum, order) => sum + calcTotal(order), 0);

  async function updatePayment(orderId: number | string, payment_status: string) {
    await supabase.from("orders").update({ payment_status }).eq("id", orderId);
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, payment_status } : order))
    );
  }

  return (
    <AdminShell
      eyebrow="Financeiro"
      title="Pagamentos"
      action={<span style={styles.pill}>{number(filteredOrders.length)} pedido(s)</span>}
    >
      <section style={styles.metrics}>
        <Metric label="Recebido" value={money(paidTotal)} detail="Pedidos marcados como pagos" />
        <Metric
          label="Pendentes"
          value={number(orders.filter((order) => (order.payment_status || "pendente") === "pendente").length)}
          detail="Aguardando conferencia"
        />
        <Metric
          label="PIX"
          value={number(orders.filter((order) => order.payment_method === "pix").length)}
          detail="Pedidos via PIX"
        />
      </section>

      <section style={styles.toolbar}>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} style={styles.select}>
          <option value="todos">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="pago">Pagos</option>
          <option value="falhou">Falhou</option>
        </select>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.cardEyebrow}>Conferencia</p>
            <h2 style={styles.cardTitle}>Status de pagamento</h2>
          </div>
        </div>

        {filteredOrders.map((order) => (
          <div key={order.id} style={styles.row}>
            <div>
              <strong>#{order.id} - {order.name || "Cliente"}</strong>
              <p style={styles.mutedSmall}>
                {formatDateTime(order.created_at)} - {(order.payment_method || "pendente").toUpperCase()} -{" "}
                {paymentStatusLabels[order.payment_status || "pendente"] || order.payment_status}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{money(calcTotal(order))}</strong>
              {Object.keys(paymentStatusLabels).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updatePayment(order.id, status)}
                  style={styles.secondaryButton}
                >
                  {paymentStatusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && <EmptyState text="Nenhum pagamento encontrado." />}
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
