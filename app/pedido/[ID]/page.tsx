"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Order = {
  id: number;
  status: string;
  created_at: string;
};

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
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
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
    return <p>Carregando pedido...</p>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          margin: "0 auto",
          background: "#fff",
          padding: 24,
          borderRadius: 20,
        }}
      >
        <h1>🍣 Missô Sushi</h1>

        <h2>Pedido #{order.id}</h2>

        <StatusStep
          active={true}
          text="Pedido recebido"
        />

        <StatusStep
          active={
            order.status === "preparando" ||
            order.status === "pronto" ||
            order.status === "retirado"
          }
          text="Em preparo"
        />

        <StatusStep
          active={
            order.status === "pronto" ||
            order.status === "retirado"
          }
          text="Pronto para retirada"
        />

        <StatusStep
          active={order.status === "retirado"}
          text="Retirado"
        />
      </div>
    </main>
  );
}

function StatusStep({
  active,
  text,
}: {
  active: boolean;
  text: string;
}) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        background: active ? "#dcfce7" : "#f3f4f6",
        fontWeight: 600,
      }}
    >
      {active ? "✅" : "⏳"} {text}
    </div>
  );
}