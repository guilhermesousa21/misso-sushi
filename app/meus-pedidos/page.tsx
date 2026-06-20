"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatCustomerPhone, isValidCustomerPhone, onlyDigits } from "../../lib/customerPhone";
import { formatOrderItemLabel } from "../../lib/itemModifiers";
import { getOrderPickupLabel, money } from "../../lib/orderFeatures";
import { useMediaQuery } from "../../lib/useMediaQuery";

type CustomerOrder = {
  id: number;
  name?: string | null;
  phone?: string | null;
  items?: {
    id: number;
    name: string;
    price: number;
    quantity?: number;
    modifiers?: string[] | null;
  }[] | null;
  total?: number | null;
  status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  fulfillment_type?: string | null;
  scheduled_for?: string | null;
  note?: string | null;
};

type Step = "phone" | "code" | "orders";

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  recebido: "Recebido",
  preparando: "Em preparo",
  pronto: "Pronto para retirada",
  retirado: "Retirado",
};

export default function MeusPedidosPage() {
  const isMobile = useMediaQuery("(max-width: 760px)");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/customer/orders");
      const data = await res.json();
      if (!res.ok) {
        setStep("phone");
        setMessage(data.error || "Sessão expirada.");
        return;
      }
      setOrders(data.orders || []);
      setStep("orders");
    } catch {
      setMessage("Não foi possível carregar seus pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  const handlePhoneChange = (value: string) => {
    setPhone(formatCustomerPhone(value));
    setMessage("");
  };

  const handleSendCode = async () => {
    if (!isValidCustomerPhone(phone)) {
      setMessage("Informe um telefone válido com DDD.");
      return;
    }

    setLoading(true);
    setMessage("");
    setDevCode("");
    try {
      const res = await fetch("/api/customer/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Não foi possível enviar o código.");
        if (data.devCode) setDevCode(String(data.devCode));
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      setStep("code");
      setMessage(data.message || "Código enviado por WhatsApp.");
    } catch {
      setMessage("Não foi possível enviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const sanitizedCode = onlyDigits(code).slice(0, 6);
    if (sanitizedCode.length !== 6) {
      setMessage("Informe o código de 6 dígitos.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/customer/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: sanitizedCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Código inválido.");
        return;
      }
      await loadOrders();
    } catch {
      setMessage("Não foi possível validar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/customer/logout", { method: "POST" });
    setOrders([]);
    setPhone("");
    setCode("");
    setDevCode("");
    setStep("phone");
    setMessage("");
  };

  return (
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>
          Voltar ao cardápio
        </Link>
        <div style={styles.headerTitle}>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>Meus pedidos</h1>
          <p style={styles.muted}>
            Consulte seus últimos pedidos pelo celular, sem precisar do link do pedido.
          </p>
        </div>
      </header>

      {step !== "orders" && (
        <section style={styles.authCard}>
          {step === "phone" ? (
            <>
              <h2 style={styles.sectionTitle}>Confirme seu telefone</h2>
              <p style={styles.mutedSmall}>
                Enviaremos um código por WhatsApp para liberar o histórico.
              </p>
              <label style={styles.field}>
                <span style={styles.label}>Celular</span>
                <input
                  value={phone}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  style={styles.input}
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={loading}
                style={styles.primaryButton}
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </>
          ) : (
            <>
              <h2 style={styles.sectionTitle}>Digite o código</h2>
              <p style={styles.mutedSmall}>
                Enviamos um código de 6 dígitos para {phone}.
              </p>
              {devCode && (
                <p style={styles.devHint}>Dev: código {devCode}</p>
              )}
              <label style={styles.field}>
                <span style={styles.label}>Código</span>
                <input
                  value={code}
                  onChange={(event) => setCode(onlyDigits(event.target.value).slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  style={styles.input}
                />
              </label>
              <div style={styles.actionRow}>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setMessage("");
                  }}
                  style={styles.secondaryButton}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerifyCode()}
                  disabled={loading}
                  style={styles.primaryButton}
                >
                  {loading ? "Validando..." : "Ver pedidos"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={loading}
                style={styles.linkButton}
              >
                Reenviar código
              </button>
            </>
          )}
          {message && <p style={styles.message}>{message}</p>}
        </section>
      )}

      {step === "orders" && (
        <section style={styles.ordersSection}>
          <div style={styles.ordersHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Últimos pedidos</h2>
              <p style={styles.mutedSmall}>Telefone {phone || "confirmado"}</p>
            </div>
            <button type="button" onClick={() => void handleLogout()} style={styles.secondaryButton}>
              Sair
            </button>
          </div>

          {loading ? (
            <p style={styles.muted}>Carregando pedidos...</p>
          ) : orders.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.muted}>Nenhum pedido pago encontrado para este telefone.</p>
              <Link href="/" style={styles.primaryLink}>
                Fazer um pedido
              </Link>
            </div>
          ) : (
            <div style={styles.orderList}>
              {orders.map((order) => (
                <article key={order.id} style={styles.orderCard}>
                  <div style={styles.orderCardHeader}>
                    <div>
                      <strong style={styles.orderId}>Pedido #{order.id}</strong>
                      <p style={styles.mutedSmall}>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString("pt-BR")
                          : "Data não informada"}
                      </p>
                    </div>
                    <span style={styles.statusBadge}>
                      {statusLabels[order.status || ""] || order.status || "Recebido"}
                    </span>
                  </div>
                  <p style={styles.pickupLine}>{getOrderPickupLabel(order)}</p>
                  <div style={styles.itemList}>
                    {(order.items || []).map((item, index) => (
                      <span key={`${order.id}-${item.id}-${index}`} style={styles.itemLine}>
                        {formatOrderItemLabel(item)}
                      </span>
                    ))}
                  </div>
                  {order.note?.trim() && (
                    <p style={styles.noteLine}>Obs: {order.note.trim()}</p>
                  )}
                  <div style={styles.orderFooter}>
                    <strong>{money(Number(order.total || 0))}</strong>
                    <Link href={`/pedido/${order.id}`} style={styles.detailLink}>
                      Acompanhar →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f1ea", color: "#171512", padding: "20px 20px 48px" },
  pageMobile: { padding: "18px 14px 38px" },
  header: { maxWidth: 760, margin: "0 auto 20px", position: "relative", textAlign: "center", paddingTop: 18 },
  headerTitle: { textAlign: "center" },
  backLink: {
    position: "absolute",
    left: 0,
    top: 18,
    color: "#8f1728",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 850,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 999,
    padding: "9px 13px",
  },
  eyebrow: { color: "#9f1d2f", fontSize: 12, fontWeight: 850, textTransform: "uppercase" },
  title: { marginTop: 6, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1, fontWeight: 850 },
  muted: { marginTop: 10, color: "#625b53", lineHeight: 1.55 },
  mutedSmall: { color: "#766e64", fontSize: 13, lineHeight: 1.45 },
  authCard: {
    maxWidth: 460,
    margin: "0 auto",
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 10,
    padding: 22,
    boxShadow: "0 8px 18px rgba(28, 26, 23, 0.035)",
    display: "grid",
    gap: 14,
  },
  sectionTitle: { margin: 0, fontSize: 22, lineHeight: 1.12 },
  field: { display: "grid", gap: 7 },
  label: { fontSize: 14, fontWeight: 850 },
  input: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    padding: "13px 14px",
    background: "#fff",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
    fontSize: 15,
  },
  primaryButton: {
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "13px 18px",
    cursor: "pointer",
    fontWeight: 850,
  },
  secondaryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fff",
    color: "#1c1a17",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 850,
  },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "#8f1728",
    cursor: "pointer",
    fontWeight: 850,
    textDecoration: "underline",
    justifySelf: "start",
  },
  actionRow: { display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 },
  message: { color: "#991b1b", fontSize: 13, fontWeight: 850, lineHeight: 1.4 },
  devHint: { color: "#0f7a4a", fontSize: 13, fontWeight: 850 },
  ordersSection: { maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 },
  ordersHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 },
  emptyBox: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 10,
    padding: 24,
    display: "grid",
    gap: 12,
    justifyItems: "start",
  },
  orderList: { display: "grid", gap: 12 },
  orderCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 10,
    padding: 18,
    display: "grid",
    gap: 10,
  },
  orderCardHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" },
  orderId: { fontSize: 18 },
  statusBadge: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#625b53",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  pickupLine: { color: "#514a43", fontSize: 14, fontWeight: 750 },
  itemList: { display: "grid", gap: 6 },
  itemLine: { color: "#514a43", fontSize: 14, lineHeight: 1.4 },
  noteLine: { color: "#766e64", fontSize: 13, lineHeight: 1.4 },
  orderFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  detailLink: { color: "#8f1728", fontWeight: 850, textDecoration: "none" },
  primaryLink: {
    display: "inline-flex",
    background: "#1c1a17",
    color: "#fffdf8",
    textDecoration: "none",
    borderRadius: 999,
    padding: "12px 16px",
    fontWeight: 850,
  },
};
