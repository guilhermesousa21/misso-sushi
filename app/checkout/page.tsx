"use client";

import { useState } from "react";
import { useCart } from "../context/CartContext";

type PaymentMethod = "pix" | "card" | null;

export default function CheckoutPage() {
  const { cart, total } = useCart();

  const [method, setMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);

  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");

  const generatePix = async () => {
    try {
      setLoading(true);
      setPixQr("");
      setPixCode("");

      const res = await fetch("/api/pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar PIX");
      }

      setPixQr(data.qr_code_base64 || "");
      setPixCode(data.qr_code || "");
    } catch (err) {
      console.log("ERRO PIX:", err);
      alert("Erro ao gerar PIX");
    } finally {
      setLoading(false);
    }
  };

  const handlePixClick = async () => {
    setMethod("pix");
    await generatePix();
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Finalizar pedido</h1>

      {/* RESUMO */}
      <div style={styles.box}>
        <h3>Resumo do pedido</h3>

        {cart.map((item) => (
          <div key={item.id} style={styles.row}>
            <span>
              {item.quantity}x {item.name}
            </span>
            <strong>
              R$ {(item.price * item.quantity).toFixed(2)}
            </strong>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div style={styles.box}>
        <h2>Total: R$ {total.toFixed(2)}</h2>
      </div>

      {/* MÉTODOS */}
      <div style={styles.methods}>
        <button onClick={handlePixClick} style={btn(method === "pix")}>
          PIX
        </button>

        <button
          onClick={() => setMethod("card")}
          style={btn(method === "card")}
        >
          Cartão
        </button>
      </div>

      {/* PIX */}
      {method === "pix" && (
        <div style={styles.box}>
          <h3>Pagamento PIX</h3>

          {loading && <p>Gerando PIX...</p>}

          {!loading && pixQr && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${pixQr}`}
                alt="QR Code PIX"
                style={{ width: 250, marginTop: 10 }}
              />
            </>
          )}

          {!loading && pixCode && (
            <textarea
              value={pixCode}
              readOnly
              style={styles.textarea}
            />
          )}
        </div>
      )}

      {/* CARTÃO */}
      {method === "card" && (
        <div style={styles.box}>
          <h3>Cartão</h3>
          <p>Integração futura com Stripe / Mercado Pago</p>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f6f6",
    padding: 20,
  } as const,

  title: {
    fontSize: 24,
    fontWeight: 700,
  } as const,

  box: {
    marginTop: 20,
    background: "#fff",
    padding: 15,
    borderRadius: 12,
  } as const,

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #eee",
  } as const,

  methods: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  } as const,

  textarea: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  } as const,
};

const btn = (active: boolean) => ({
  flex: 1,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: active ? "#000" : "#fff",
  color: active ? "#fff" : "#000",
  fontWeight: 600,
  cursor: "pointer",
});