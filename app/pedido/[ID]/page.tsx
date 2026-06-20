"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { formatAddonSummary, getOrderPickupLabel } from "../../../lib/orderFeatures";
import { supabase } from "../../../lib/supabase";
import { useCart } from "../../context/CartContext";

type Order = {
  id: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
  addons?: { id: string; name: string; quantity: number }[] | null;
  items?: {
    id: number;
    name: string;
    price: number;
    category?: string;
    quantity?: number;
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
  const handleRepeatOrder = () => {
    clear();
    (order.items || []).forEach((item) => {
      const quantity = item.quantity ?? 1;
      for (let index = 0; index < quantity; index += 1) {
        addToCart({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          category: item.category || "",
        });
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

        <div style={styles.statusCard}>
          <span style={styles.statusLabel}>Status atual</span>
          <strong style={styles.statusValue}>
            {steps[current]?.label || customerStatus}
          </strong>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoBox}>
            <span>Retirada</span>
            <strong>{getOrderPickupLabel(order)}</strong>
          </div>
          <div style={styles.infoBox}>
            <span>Complementos</span>
            <strong>{addonSummary || "Nenhum"}</strong>
          </div>
        </div>

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
  statusCard: {
    marginTop: 24,
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: 18,
  },
  statusLabel: {
    display: "block",
    color: "#d8d0c4",
    fontSize: 13,
    fontWeight: 800,
  },
  statusValue: {
    display: "block",
    marginTop: 6,
    fontSize: 26,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  infoBox: {
    display: "grid",
    gap: 5,
    borderRadius: 8,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffaf2",
    padding: 12,
    color: "#514a43",
    fontSize: 13,
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
