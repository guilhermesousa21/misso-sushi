"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "../context/CartContext";

type PaymentMethod = "pix" | "card" | null;

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function CheckoutPage() {
  const { cart, total } = useCart();
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [note, setNote] = useState("");

  const generatePix = async () => {
    try {
      setLoading(true);
      setPixQr("");
      setPixCode("");

      const res = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, note }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar PIX");

      setPixQr(data.qr_code_base64 || "");
      setPixCode(data.qr_code || "");
    } catch (err) {
      console.error("ERRO PIX:", err);
      alert("Erro ao gerar PIX");
    } finally {
      setLoading(false);
    }
  };

  const handlePixClick = async () => {
    setMethod("pix");
    await generatePix();
  };

  const handleCopyPix = async () => {
    await navigator.clipboard.writeText(pixCode);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  if (cart.length === 0) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <p style={styles.eyebrow}>Checkout</p>
          <h1 style={styles.title}>Seu carrinho está vazio</h1>
          <p style={styles.muted}>
            Volte ao cardápio e escolha seus pratos favoritos.
          </p>
          <Link href="/" style={styles.primaryLink}>
            Ver cardápio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>
          Voltar ao cardápio
        </Link>
        <div>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>Finalizar pedido</h1>
        </div>
      </header>

      <div style={styles.shell}>
        <section style={styles.mainColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Resumo</p>
                <h2 style={styles.cardTitle}>Itens do pedido</h2>
              </div>
              <span style={styles.pill}>{cart.length} item(ns)</span>
            </div>

            <div style={styles.orderList}>
              {cart.map((item) => (
                <div key={item.id} style={styles.orderRow}>
                  <div>
                    <strong style={styles.itemName}>
                      {item.quantity}x {item.name}
                    </strong>
                    <p style={styles.mutedSmall}>
                      {money(Number(item.price))} cada
                    </p>
                  </div>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <label htmlFor="note" style={styles.label}>
              Observação do pedido
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: sem cebolinha, enviar shoyu extra..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Pagamento</p>
                <h2 style={styles.cardTitle}>Escolha uma forma</h2>
              </div>
            </div>

            <div style={styles.methods}>
              <button
                type="button"
                onClick={handlePixClick}
                style={{
                  ...styles.methodButton,
                  ...(method === "pix" ? styles.methodButtonActive : {}),
                }}
              >
                PIX
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                style={{
                  ...styles.methodButton,
                  ...(method === "card" ? styles.methodButtonActive : {}),
                }}
              >
                Cartão
              </button>
            </div>

            {method === "pix" && (
              <div style={styles.paymentBox}>
                <h3 style={styles.paymentTitle}>Pagamento PIX</h3>
                {loading && <p style={styles.muted}>Gerando PIX...</p>}
                {!loading && pixQr && (
                  <div style={styles.qrWrap}>
                    <Image
                      src={`data:image/png;base64,${pixQr}`}
                      alt="QR Code PIX"
                      width={240}
                      height={240}
                      style={styles.qrImage}
                    />
                    <p style={styles.mutedSmall}>
                      Escaneie o QR Code com o aplicativo do seu banco.
                    </p>
                  </div>
                )}
                {!loading && pixCode && (
                  <div style={styles.pixCodeBox}>
                    <label htmlFor="pixCode" style={styles.label}>
                      Código copia e cola
                    </label>
                    <textarea
                      id="pixCode"
                      value={pixCode}
                      readOnly
                      style={styles.codeArea}
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      style={styles.secondaryButton}
                    >
                      Copiar código PIX
                    </button>
                    {showFeedback && (
                      <p style={styles.successText}>Código PIX copiado.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {method === "card" && (
              <div style={styles.paymentBox}>
                <h3 style={styles.paymentTitle}>Pagamento com cartão</h3>
                <p style={styles.muted}>
                  Integração futura com Mercado Pago ou outro provedor.
                </p>
                <div style={styles.disabledForm}>
                  <input placeholder="Número do cartão" style={styles.input} />
                  <input placeholder="Validade (MM/AA)" style={styles.input} />
                  <input placeholder="CVV" style={styles.input} />
                </div>
              </div>
            )}
          </div>
        </section>

        <aside style={styles.summaryCard}>
          <p style={styles.cardEyebrow}>Total</p>
          <strong style={styles.total}>{money(total)}</strong>
          <p style={styles.muted}>
            Confira os itens antes de concluir o pagamento.
          </p>
          <div style={styles.divider} />
          <div style={styles.summaryLine}>
            <span>Itens</span>
            <strong>{cart.reduce((sum, item) => sum + item.quantity, 0)}</strong>
          </div>
          <div style={styles.summaryLine}>
            <span>Pagamento</span>
            <strong>{method ? method.toUpperCase() : "Pendente"}</strong>
          </div>
        </aside>
      </div>
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
  header: {
    maxWidth: 1120,
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
  },
  backLink: {
    color: "#9f1d2f",
    textDecoration: "none",
    fontWeight: 800,
  },
  eyebrow: {
    color: "#9f1d2f",
    fontSize: 13,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    fontSize: "clamp(34px, 5vw, 56px)",
    lineHeight: 1,
    fontWeight: 850,
  },
  shell: {
    maxWidth: 1120,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
    gap: 18,
    alignItems: "start",
  },
  mainColumn: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 20,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 16,
  },
  cardEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  pill: {
    borderRadius: 999,
    background: "#f0ebe2",
    padding: "7px 10px",
    color: "#625b53",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  orderList: {
    display: "grid",
    gap: 12,
  },
  orderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 12,
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  itemName: {
    display: "block",
    lineHeight: 1.35,
  },
  muted: {
    color: "#625b53",
    lineHeight: 1.55,
  },
  mutedSmall: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.4,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 850,
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    resize: "vertical",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
  },
  methods: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },
  methodButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "#fff",
    borderRadius: 999,
    padding: 14,
    color: "#1c1a17",
    cursor: "pointer",
    fontWeight: 850,
  },
  methodButtonActive: {
    background: "#1c1a17",
    borderColor: "#1c1a17",
    color: "#fffdf8",
  },
  paymentBox: {
    marginTop: 18,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    paddingTop: 18,
  },
  paymentTitle: {
    fontSize: 19,
    marginBottom: 10,
  },
  qrWrap: {
    display: "grid",
    justifyItems: "start",
    gap: 10,
  },
  qrImage: {
    borderRadius: 8,
    border: "1px solid rgba(28, 26, 23, 0.08)",
  },
  pixCodeBox: {
    marginTop: 16,
  },
  codeArea: {
    width: "100%",
    minHeight: 88,
    resize: "vertical",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    color: "#514a43",
    background: "#f7f4ef",
  },
  secondaryButton: {
    marginTop: 10,
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 850,
  },
  successText: {
    marginTop: 8,
    color: "#0f7a4a",
    fontWeight: 850,
  },
  disabledForm: {
    display: "grid",
    gap: 10,
    opacity: 0.65,
  },
  input: {
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
  },
  summaryCard: {
    position: "sticky",
    top: 24,
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.18)",
  },
  total: {
    display: "block",
    margin: "10px 0",
    fontSize: 38,
    lineHeight: 1,
  },
  divider: {
    height: 1,
    background: "rgba(255, 253, 248, 0.16)",
    margin: "18px 0",
  },
  summaryLine: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    color: "#d8d0c4",
  },
  emptyState: {
    maxWidth: 640,
    margin: "0 auto",
    minHeight: "70vh",
    display: "grid",
    alignContent: "center",
    justifyItems: "start",
  },
  primaryLink: {
    marginTop: 22,
    display: "inline-flex",
    background: "#1c1a17",
    color: "#fffdf8",
    textDecoration: "none",
    borderRadius: 999,
    padding: "13px 18px",
    fontWeight: 850,
  },
};
