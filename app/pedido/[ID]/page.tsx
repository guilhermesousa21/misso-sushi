"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatAddonSummary, getOrderPickupLabel, money } from "../../../lib/orderFeatures";
import { formatItemModifiers } from "../../../lib/itemModifiers";
import { supabase } from "../../../lib/supabase";
import { formatBrasiliaDateTimeShort } from "../../../lib/brasiliaTime";
import { useCart } from "../../context/CartContext";
import { BackToMenuLink } from "../../components/BackToMenuLink";
import { useIsMobile } from "../../../lib/useMediaQuery";

type Order = {
  id: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  payment_method?: string | null;
  name?: string | null;
  phone?: string | null;
  mercado_pago_payment_id?: string | null;
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

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export default function PedidoPage({
  params,
}: {
  params: Promise<{ ID: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [pixQr, setPixQr] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const { ID: orderId } = use(params);
  const router = useRouter();
  const { clear, addToCart } = useCart();
  const isMobile = useIsMobile();

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
  const paymentMethod = (order.payment_method || "pix").toLowerCase();
  const isPaymentPending =
    !isPaid && (order.payment_status || "pendente").trim().toLowerCase() === "pendente";

  const handleContinuePayment = async () => {
    setPaymentError("");
    setPaymentLoading(true);

    try {
      if (paymentMethod === "card") {
        const preferenceRes = await fetch("/api/checkout/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            amount: orderTotal,
            title: `Missô Sushi #${order.id}`,
            payer: { name: order.name || "Cliente", email: "cliente@email.com" },
          }),
        });
        const preferenceData = await preferenceRes.json();
        if (!preferenceRes.ok || !preferenceData.init_point) {
          throw new Error(preferenceData.error || preferenceData.detail || "Não foi possível iniciar o pagamento.");
        }
        window.location.assign(String(preferenceData.init_point));
        return;
      }

      const pixRes = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: orderTotal,
          note: `Missô Sushi #${order.id}`,
          payer: { name: order.name || "Cliente", phone: onlyDigits(order.phone || "") },
        }),
      });
      const pixData = await pixRes.json();
      if (!pixRes.ok || !pixData.payment_id || (!pixData.qr_code_base64 && !pixData.qr_code)) {
        throw new Error(pixData.error || pixData.detail || "Não foi possível gerar o PIX.");
      }

      await supabase
        .from("orders")
        .update({ mercado_pago_payment_id: String(pixData.payment_id) })
        .eq("id", order.id);

      setPixQr(pixData.qr_code_base64 || "");
      setPixCode(pixData.qr_code || "");
      setShowPix(true);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Não foi possível continuar o pagamento.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    setCopyFeedback(true);
    window.setTimeout(() => setCopyFeedback(false), 2000);
  };

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
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <section style={{ ...styles.panel, ...(isMobile ? styles.panelMobile : {}) }}>
        <BackToMenuLink />
        <p style={styles.eyebrow}>Acompanhe em tempo real</p>
        <h1 style={styles.title}>Pedido #{order.id}</h1>
        <p style={styles.muted}>
          Atualizado em {formatBrasiliaDateTimeShort(order.created_at)}
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

        {isPaymentPending && showPix && (pixCode || pixQr) && (
          <div style={styles.pixPanel}>
            <p style={styles.pixPanelTitle}>Pagamento PIX</p>
            <p style={styles.pixPanelHint}>
              Escaneie o QR Code ou copie o código. Esta página atualiza sozinha quando o pagamento for confirmado.
            </p>
            <div style={styles.pixQrBox}>
              {pixCode ? (
                <QRCodeSVG value={pixCode} size={220} level="M" includeMargin />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/png;base64,${pixQr}`} alt="QR Code PIX" width={220} height={220} />
              )}
              <strong style={styles.pixAmount}>{money(orderTotal)}</strong>
            </div>
            {pixCode && (
              <>
                <label htmlFor="pixCode" style={styles.pixLabel}>
                  Código copia e cola
                </label>
                <textarea id="pixCode" value={pixCode} readOnly style={styles.pixCodeArea} />
                <button type="button" onClick={handleCopyPix} style={styles.copyPixButton}>
                  {copyFeedback ? "Código PIX copiado" : "Copiar código PIX"}
                </button>
              </>
            )}
          </div>
        )}

        {isPaymentPending && !showPix && (
          <>
            <button
              type="button"
              onClick={handleContinuePayment}
              disabled={paymentLoading}
              style={{
                ...styles.payButton,
                ...(isMobile ? styles.payButtonMobileHidden : {}),
                ...(paymentLoading ? styles.payButtonDisabled : {}),
              }}
            >
              {paymentLoading
                ? "Preparando pagamento..."
                : `Pagar pedido · ${money(orderTotal)}`}
            </button>
            {!isMobile && (
              <p style={styles.payHint}>
                {paymentMethod === "card"
                  ? "Você será redirecionado ao Mercado Pago para concluir o pagamento."
                  : "Seu pedido só entra na cozinha após a confirmação do pagamento."}
              </p>
            )}
          </>
        )}

        {paymentError && <p style={styles.paymentError}>{paymentError}</p>}

        {isPaid && (order.items || []).length > 0 && (
          <button type="button" onClick={handleRepeatOrder} style={styles.repeatButton}>
            Repetir este pedido
          </button>
        )}
      </section>

      {isMobile && isPaymentPending && !showPix && (
        <div style={styles.mobilePayBar}>
          <div style={styles.mobilePayMeta}>
            <span>Pedido #{order.id}</span>
            <strong>{money(orderTotal)}</strong>
          </div>
          <button
            type="button"
            onClick={handleContinuePayment}
            disabled={paymentLoading}
            style={{
              ...styles.mobilePayBarButton,
              ...(paymentLoading ? styles.payButtonDisabled : {}),
            }}
          >
            {paymentLoading ? "Preparando..." : "Pagar pedido"}
          </button>
        </div>
      )}
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
  pageMobile: {
    padding: "20px 14px calc(100px + env(safe-area-inset-bottom, 0px))",
    placeItems: "start stretch",
  },
  panel: {
    width: "min(560px, 100%)",
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 28,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.08)",
  },
  panelMobile: {
    width: "100%",
    padding: 18,
    borderRadius: 10,
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
  payButton: {
    marginTop: 18,
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fffdf8",
    padding: "15px 18px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 16,
    boxShadow: "0 14px 28px rgba(159, 29, 47, 0.22)",
  },
  payButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  payButtonMobileHidden: {
    display: "none",
  },
  mobilePayBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    background: "rgba(255, 253, 248, 0.96)",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "12px 14px calc(12px + env(safe-area-inset-bottom, 0px))",
    boxShadow: "0 -12px 28px rgba(28, 26, 23, 0.1)",
    display: "grid",
    gap: 10,
  },
  mobilePayMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 850,
    color: "#514a43",
  },
  mobilePayBarButton: {
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fffdf8",
    padding: "15px 18px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 16,
  },
  payHint: {
    marginTop: 10,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.45,
    textAlign: "center",
  },
  paymentError: {
    marginTop: 12,
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    fontWeight: 800,
    fontSize: 13,
    lineHeight: 1.4,
  },
  pixPanel: {
    marginTop: 18,
    borderRadius: 8,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffaf2",
    padding: 18,
    display: "grid",
    gap: 12,
  },
  pixPanelTitle: {
    fontSize: 18,
    fontWeight: 850,
    lineHeight: 1.2,
  },
  pixPanelHint: {
    color: "#625b53",
    fontSize: 13,
    lineHeight: 1.45,
  },
  pixQrBox: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
    padding: "8px 0",
  },
  pixAmount: {
    fontSize: 24,
    color: "#1c1a17",
  },
  pixLabel: {
    fontSize: 14,
    fontWeight: 850,
  },
  pixCodeArea: {
    width: "100%",
    minHeight: 96,
    resize: "none",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    padding: 12,
    color: "#514a43",
    background: "#fff",
    lineHeight: 1.45,
  },
  copyPixButton: {
    width: "100%",
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 850,
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
