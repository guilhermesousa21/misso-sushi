"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { formatAddonSummary, getOrderPickupLabel, money } from "../../../lib/orderFeatures";
import { formatItemModifiers } from "../../../lib/itemModifiers";
import { supabase } from "../../../lib/supabase";
import { useCart } from "../../context/CartContext";

type Order = {
  id: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  loyalty_discount?: number | null;
  service_fee?: number | null;
  service_fee_label?: string | null;
  total?: number | null;
  addons?: { id: string; name: string; quantity: number; unit_price?: number | null }[] | null;
  items?: {
    id: number;
    name: string;
    price: number;
    category?: string;
    quantity?: number;
    modifiers?: string[] | null;
  }[] | null;
};

const steps = [
  { key: "aguardando_pagamento", label: "Aguardando pagamento", doneText: "Pago" },
  { key: "recebido", label: "Pedido recebido", doneText: "Recebido" },
  { key: "preparando", label: "Em preparo", doneText: "Preparando" },
  { key: "pronto", label: "Pronto para retirada", doneText: "Pronto" },
  { key: "retirado", label: "Retirado", doneText: "Retirado" },
];

const statusIndex = (status: string) =>
  Math.max(
    0,
    steps.findIndex((step) => step.key === status)
  );

const isPaymentConfirmed = (order: Order) =>
  (order.payment_status || "").trim().toLowerCase() === "pago";

const getCustomerStatus = (order: Order) => {
  if (!isPaymentConfirmed(order)) {
    return "aguardando_pagamento";
  }

  if (["aguardando_pagamento", "recebido"].includes(order.status)) {
    return "preparando";
  }

  return order.status;
};

export default function PedidoPage({
  params,
}: {
  params: Promise<{ ID: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const { ID: orderId } = use(params);
  const router = useRouter();
  const { clear, addToCart } = useCart();

  useEffect(() => {
    async function loadOrder() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (data) setOrder(data);
    }

    loadOrder();

    const channel = supabase
      .channel(`pedido-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          if (payload.new.id === Number(orderId)) {
            setOrder(payload.new as Order);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (!order) {
    return (
      <main style={styles.page}>
        <section style={styles.panel}>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>Abrindo seu pedido...</h1>
          <p style={styles.muted}>Estamos conferindo o pagamento e o status da retirada.</p>
        </section>
      </main>
    );
  }

  const isPaid = isPaymentConfirmed(order);
  const customerStatus = getCustomerStatus(order);
  const current = statusIndex(customerStatus);
  const addonSummary = formatAddonSummary(order.addons);
  const itemCount = (order.items || []).reduce(
    (sum, item) => sum + (item.quantity ?? 1),
    0
  );
  const addonTotal = (order.addons || []).reduce(
    (sum, addon) => sum + Number(addon.unit_price || 0) * (addon.quantity || 0),
    0
  );
  const subtotal = Number(order.subtotal || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const loyaltyDiscount = Number(order.loyalty_discount || 0);
  const serviceFee = Number(order.service_fee || 0);
  const serviceFeeLabel = order.service_fee_label?.trim() || "Taxa de embalagem";
  const orderTotal = Number(order.total || 0);
  const handleRepeatOrder = () => {
    clear();
    (order.items || []).forEach((item) => {
      const quantity = item.quantity ?? 1;
      addToCart(
        {
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          category: item.category || "",
        },
        item.modifiers || []
      );
      if (quantity > 1) {
        for (let index = 1; index < quantity; index += 1) {
          addToCart(
            {
              id: item.id,
              name: item.name,
              price: Number(item.price || 0),
              category: item.category || "",
            },
            item.modifiers || []
          );
        }
      }
    });
    router.push("/checkout");
  };

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <Link href="/" style={styles.backLink}>
          Voltar ao cardápio
        </Link>
        <p style={styles.eyebrow}>Acompanhe em tempo real</p>
        <h1 style={styles.title}>Pedido #{order.id}</h1>
        <p style={styles.muted}>
          Atualizado em {new Date(order.created_at).toLocaleString("pt-BR")}
        </p>

        {(order.items || []).length > 0 && (
          <div style={styles.summaryCard}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Resumo</p>
                <h2 style={styles.cardTitle}>Seu pedido</h2>
              </div>
              <span style={styles.summaryPill}>
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
            </div>

            <div style={styles.orderList}>
              {(order.items || []).map((item, index) => {
                const quantity = item.quantity ?? 1;
                const unitPrice = Number(item.price || 0);
                const modifierText = formatItemModifiers(item.modifiers);

                return (
                  <div key={`${item.id}-${index}`} style={styles.summaryOrderRow}>
                    <div>
                      <strong style={styles.itemName}>
                        {quantity}x {item.name}
                        {modifierText ? ` (${modifierText})` : ""}
                      </strong>
                      <p style={styles.summaryMuted}>{money(unitPrice)} cada</p>
                    </div>
                    <strong>{money(unitPrice * quantity)}</strong>
                  </div>
                );
              })}
            </div>

            <div style={styles.summaryTotalBox}>
              {(discountAmount > 0 || serviceFee > 0 || addonTotal > 0) && subtotal > 0 && (
                <div style={styles.summaryTotalLine}>
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
              )}
              {addonTotal > 0 && (
                <div style={styles.summaryTotalLine}>
                  <span>Complementos</span>
                  <strong>{money(addonTotal)}</strong>
                </div>
              )}
              {serviceFee > 0 && (
                <div style={styles.summaryTotalLine}>
                  <span>{serviceFeeLabel}</span>
                  <strong>{money(serviceFee)}</strong>
                </div>
              )}
              {discountAmount > 0 && (
                <div style={styles.summaryTotalLine}>
                  <span>Desconto cupom</span>
                  <strong style={styles.discountText}>-{money(discountAmount)}</strong>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div style={styles.summaryTotalLine}>
                  <span>Fidelidade</span>
                  <strong style={styles.discountText}>-{money(loyaltyDiscount)}</strong>
                </div>
              )}
              {addonSummary && (
                <div style={styles.addonSummary}>Complementos: {addonSummary}</div>
              )}
              <div style={styles.addonSummary}>
                Retirada: {getOrderPickupLabel(order)}
              </div>
              <div style={styles.summaryGrandTotalLine}>
                <span>Total</span>
                <strong>{money(orderTotal)}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={styles.timeline}>
          {steps.map((step, index) => {
            const isPaymentStep = step.key === "aguardando_pagamento";
            const active = isPaymentStep ? isPaid : index <= current;

            return (
              <StatusStep
                key={step.key}
                active={active}
                current={isPaymentStep ? !isPaid : index === current}
                text={isPaymentStep && isPaid ? "Pagamento confirmado" : step.label}
                statusText={active ? step.doneText : "Aguardando"}
              />
            );
          })}
        </div>
        {(order.items || []).length > 0 && (
          <button type="button" onClick={handleRepeatOrder} style={styles.repeatButton}>
            Repetir este pedido
          </button>
        )}
      </section>
    </main>
  );
}

function StatusStep({
  active,
  current,
  statusText,
  text,
}: {
  active: boolean;
  current: boolean;
  statusText: string;
  text: string;
}) {
  return (
    <div style={styles.step}>
      <span
        className={
          current && active
            ? "current-done-dot"
            : current && !active
              ? "pending-payment-dot"
              : undefined
        }
        style={{
          ...styles.stepDot,
          ...(active ? styles.stepDotActive : {}),
          ...(current && active ? styles.stepDotCurrentDone : {}),
          ...(current && !active ? styles.stepDotCurrentPending : {}),
        }}
      />
      <div>
        <strong style={styles.stepTitle}>{text}</strong>
        <p style={styles.stepText}>{statusText}</p>
      </div>
      <style jsx global>{`
        @keyframes pendingPaymentPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(153, 27, 27, 0.2);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 0 7px rgba(153, 27, 27, 0.1);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(153, 27, 27, 0);
          }
        }

        .pending-payment-dot {
          animation: pendingPaymentPulse 2.2s ease-in-out infinite;
        }

        @keyframes currentDonePulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.22);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.12);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
          }
        }

        .current-done-dot {
          animation: currentDonePulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "32px 20px",
    display: "grid",
    placeItems: "center",
  },
  panel: {
    width: "min(560px, 100%)",
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 28,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.08)",
  },
  backLink: {
    display: "inline-flex",
    marginBottom: 24,
    color: "#9f1d2f",
    textDecoration: "none",
    fontWeight: 850,
  },
  eyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    fontSize: "clamp(34px, 7vw, 56px)",
    lineHeight: 1,
  },
  muted: {
    marginTop: 10,
    color: "#625b53",
    lineHeight: 1.55,
  },
  summaryCard: {
    marginTop: 24,
    background: "#171512",
    color: "#fffdf8",
    border: "1px solid rgba(255, 253, 248, 0.08)",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 16px 36px rgba(23, 21, 18, 0.16)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 18,
  },
  cardEyebrow: {
    color: "#9f1d2f",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  cardTitle: {
    marginTop: 5,
    fontSize: 23,
    lineHeight: 1.12,
  },
  summaryPill: {
    borderRadius: 999,
    background: "rgba(255, 253, 248, 0.12)",
    padding: "7px 10px",
    color: "#fffdf8",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  orderList: {
    display: "grid",
    gap: 13,
  },
  summaryOrderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 13,
    borderBottom: "1px solid rgba(255, 253, 248, 0.12)",
  },
  itemName: {
    display: "block",
    lineHeight: 1.35,
  },
  summaryMuted: {
    marginTop: 4,
    color: "rgba(255, 253, 248, 0.68)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  summaryTotalBox: {
    display: "grid",
    gap: 10,
    marginTop: 18,
  },
  summaryTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "rgba(255, 253, 248, 0.78)",
    fontSize: 15,
  },
  addonSummary: {
    color: "rgba(255, 253, 248, 0.66)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  discountText: {
    color: "#0f7a4a",
  },
  summaryGrandTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#fffdf8",
    fontSize: 22,
    fontWeight: 850,
  },
  timeline: {
    marginTop: 24,
    display: "grid",
    gap: 14,
  },
  step: {
    display: "grid",
    gridTemplateColumns: "28px 1fr",
    gap: 12,
    alignItems: "start",
    padding: "14px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    marginTop: 2,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#d8d0c4",
    background: "#fffdf8",
  },
  stepDotActive: {
    background: "#16a34a",
    borderColor: "#16a34a",
  },
  stepDotCurrentDone: {
    boxShadow: "0 0 0 5px rgba(22, 163, 74, 0.16)",
  },
  stepDotCurrentPending: {
    background: "#991b1b",
    borderColor: "#991b1b",
  },
  stepTitle: {
    display: "block",
    lineHeight: 1.25,
  },
  stepText: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
  },
  repeatButton: {
    marginTop: 18,
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 850,
  },
};
