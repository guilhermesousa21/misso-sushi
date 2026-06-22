"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { getOrderPickupLabel, money, type OperationalSettings } from "../../../lib/orderFeatures";
import { formatItemModifiers } from "../../../lib/itemModifiers";
import { supabase } from "../../../lib/supabase";
import { formatBrasiliaDateTimeShort } from "../../../lib/brasiliaTime";
import { useCart } from "../../context/CartContext";
import { BackToMenuLink } from "../../components/BackToMenuLink";
import { BrandLogo } from "../../components/BrandLogo";
import { OrderTimeline } from "../../components/OrderTimeline";
import { PixPaymentPanel } from "../../components/PixPaymentPanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
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
  note?: string | null;
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
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings | null>(null);
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
      const [{ data }, { data: settingsData }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("store_settings").select("average_time").limit(1).maybeSingle(),
      ]);

      if (data) setOrder(data);
      if (settingsData) setOperationalSettings(settingsData as OperationalSettings);
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
      <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
        <section style={{ ...styles.panel, ...(isMobile ? styles.panelMobile : {}) }}>
          <BrandLogo size="sm" />
          <p style={{ ...styles.eyebrow, marginTop: 16 }}>Acompanhe em tempo real</p>
          <h1 style={styles.title}>Abrindo seu pedido...</h1>
          <p style={styles.muted}>Estamos conferindo o pagamento e o status da retirada.</p>
        </section>
      </main>
    );
  }

  const isPaid = isPaymentConfirmed(order);
  const customerStatus = getCustomerStatus(order);
  const current = statusIndex(customerStatus);
  const selectedAddons = (order.addons || []).filter(
    (addon) => Number(addon.quantity || 0) > 0
  );
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
          <div style={{ ...styles.summaryCard, ...(isMobile ? styles.summaryCardMobile : {}) }}>
            <div style={{ ...styles.cardHeader, ...(isMobile ? styles.cardHeaderMobile : {}) }}>
              <div>
                <p style={styles.cardEyebrow}>Resumo</p>
                <h2 style={styles.cardTitle}>Seu pedido</h2>
              </div>
              <Badge variant="dark">
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </Badge>
            </div>

            <div style={styles.orderList}>
              {(order.items || []).map((item, index) => {
                const quantity = item.quantity ?? 1;
                const unitPrice = Number(item.price || 0);
                const modifierText = formatItemModifiers(item.modifiers);

                return (
                  <div key={`${item.id}-${index}`} style={{ ...styles.summaryOrderRow, ...(isMobile ? styles.summaryOrderRowMobile : {}) }}>
                    <div style={styles.summaryOrderMain}>
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
                <>
                  <div style={styles.summaryTotalLine}>
                    <span>Complementos</span>
                    <strong>{money(addonTotal)}</strong>
                  </div>
                  <div style={styles.addonSummaryList}>
                    {selectedAddons.map((addon) => (
                      <div key={addon.id || addon.name} style={styles.addonSummaryRow}>
                        <span style={styles.addonSummaryName}>
                          {Number(addon.quantity || 0)}x {addon.name}{" "}
                          {money(Number(addon.unit_price || 0) * Number(addon.quantity || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
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
              <div style={styles.addonSummary}>
                Retirada: {getOrderPickupLabel(order, operationalSettings)}
              </div>
              {order.note?.trim() && (
                <div style={styles.orderNote}>
                  <span style={styles.orderNoteLabel}>Observação</span>
                  <p style={styles.orderNoteText}>{order.note.trim()}</p>
                </div>
              )}
              <div style={styles.summaryGrandTotalLine}>
                <span>Total</span>
                <strong>{money(orderTotal)}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={styles.timelineWrap}>
          <OrderTimeline steps={steps} currentIndex={current} isPaid={isPaid} />
        </div>

        {isPaymentPending && showPix && (pixCode || pixQr) && (
          <PixPaymentPanel
            amountLabel={money(orderTotal)}
            pixCode={pixCode}
            pixQr={pixQr}
            copyFeedback={copyFeedback}
            onCopy={() => void handleCopyPix()}
          />
        )}

        {isPaymentPending && !showPix && (
          <>
            <Button
              type="button"
              onClick={handleContinuePayment}
              disabled={paymentLoading}
              fullWidth
              size="lg"
              style={{
                marginTop: 18,
                ...(isMobile ? styles.payButtonMobileHidden : {}),
              }}
            >
              {paymentLoading
                ? "Preparando pagamento..."
                : `Realizar pagamento · ${money(orderTotal)}`}
            </Button>
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
          <Button type="button" onClick={handleRepeatOrder} variant="secondary" fullWidth style={{ marginTop: 14 }}>
            Repetir este pedido
          </Button>
        )}
      </section>

      {isMobile && isPaymentPending && !showPix && (
        <div style={styles.mobilePayBar}>
          <div style={styles.mobilePayMeta}>
            <span>Pedido #{order.id}</span>
            <strong>{money(orderTotal)}</strong>
          </div>
          <Button
            type="button"
            onClick={handleContinuePayment}
            disabled={paymentLoading}
            size="md"
            fullWidth
          >
            {paymentLoading ? "Preparando..." : "Realizar pagamento"}
          </Button>
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
  summaryCardMobile: {
    marginTop: 18,
    padding: 18,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 18,
  },
  cardHeaderMobile: {
    gap: 10,
    marginBottom: 14,
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
  summaryOrderRowMobile: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 12,
  },
  summaryOrderMain: {
    minWidth: 0,
  },
  itemName: {
    display: "block",
    lineHeight: 1.35,
    minWidth: 0,
    overflowWrap: "anywhere",
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
  orderNote: {
    display: "grid",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255, 253, 248, 0.06)",
    border: "1px solid rgba(255, 253, 248, 0.1)",
  },
  orderNoteLabel: {
    color: "rgba(255, 253, 248, 0.55)",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  orderNoteText: {
    color: "rgba(255, 253, 248, 0.82)",
    fontSize: 13,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  addonSummaryList: {
    display: "grid",
    gap: 6,
    paddingLeft: 10,
    borderLeft: "2px solid rgba(255, 253, 248, 0.12)",
  },
  addonSummaryRow: {
    color: "rgba(255, 253, 248, 0.66)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  addonSummaryName: {
    minWidth: 0,
    overflowWrap: "anywhere",
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
  timelineWrap: {
    marginTop: 4,
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
};
