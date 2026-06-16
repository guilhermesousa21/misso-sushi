"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Order = {
  id: number;
  status: string;
  created_at: string;
};

const steps = [
  { key: "recebido", label: "Pedido recebido" },
  { key: "preparando", label: "Em preparo" },
  { key: "pronto", label: "Pronto para retirada" },
  { key: "retirado", label: "Retirado" },
];

const statusIndex = (status: string) =>
  Math.max(
    0,
    steps.findIndex((step) => step.key === status)
  );

export default function PedidoPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function loadOrder() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) setOrder(data);
    }

    loadOrder();

    const channel = supabase
      .channel(`pedido-${params.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          if (payload.new.id === Number(params.id)) {
            setOrder(payload.new as Order);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  if (!order) {
    return (
      <main style={styles.page}>
        <section style={styles.panel}>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>Carregando pedido...</h1>
          <p style={styles.muted}>Estamos buscando o status mais recente.</p>
        </section>
      </main>
    );
  }

  const current = statusIndex(order.status);

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
            {steps[current]?.label || order.status}
          </strong>
        </div>

        <div style={styles.timeline}>
          {steps.map((step, index) => (
            <StatusStep
              key={step.key}
              active={index <= current}
              current={index === current}
              text={step.label}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusStep({
  active,
  current,
  text,
}: {
  active: boolean;
  current: boolean;
  text: string;
}) {
  return (
    <div style={styles.step}>
      <span
        style={{
          ...styles.stepDot,
          ...(active ? styles.stepDotActive : {}),
          ...(current ? styles.stepDotCurrent : {}),
        }}
      />
      <div>
        <strong style={styles.stepTitle}>{text}</strong>
        <p style={styles.stepText}>{active ? "Concluído" : "Aguardando"}</p>
      </div>
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
    border: "2px solid #d8d0c4",
    background: "#fffdf8",
  },
  stepDotActive: {
    background: "#9f1d2f",
    borderColor: "#9f1d2f",
  },
  stepDotCurrent: {
    boxShadow: "0 0 0 5px rgba(159, 29, 47, 0.14)",
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
};
