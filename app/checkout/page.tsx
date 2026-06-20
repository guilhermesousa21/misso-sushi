"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabase";
import {
  getBusinessHours,
  getNextOpeningLabel,
  isStoreAcceptingOrders,
  isWithinBusinessHours,
  weeklyBusinessHours,
  type BusinessHours,
} from "../../lib/storeHours";
import {
  buildPickupSlots,
  getCheckoutAddons,
  formatPickupTime,
  getOrderSlotLimit,
  getPickupSlotMinutes,
  getServiceFee,
  getServiceFeeLabel,
  toLocalInputValue,
  type OperationalSettings,
  type OrderFulfillmentType,
} from "../../lib/orderFeatures";
import {
  LOYALTY_DISCOUNT_VALUE,
  LOYALTY_ORDER_INTERVAL,
  type LoyaltyStatus,
} from "../../lib/loyalty";
import { useMediaQuery } from "../../lib/useMediaQuery";
import type { MenuItem } from "../../types";
import { useCart } from "../context/CartContext";
import { money, isItemOrderable } from "../../lib/orderUtils";

type PaymentMethod = "pix" | "card";

type Promotion = {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_value?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
};

type CheckoutState = "form" | "generating" | "awaiting_pix" | "paid";

const PIX_WAIT_SECONDS = 15 * 60;

const sanitizeName = (value: string) =>
  value
    .replace(/[^\p{L}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, 30)
    .toLocaleUpperCase("pt-BR");

const normalizeName = (value: string) => sanitizeName(value).trim();

const hasFirstAndLastName = (value: string) =>
  normalizeName(value).split(" ").filter(Boolean).length >= 2;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const sanitizeCoupon = (value: string) =>
  value.replace(/[^a-z0-9-]/gi, "").slice(0, 24).toUpperCase();

const calculateDiscount = (promotion: Promotion | null, subtotal: number) => {
  if (!promotion || subtotal <= 0) return 0;
  const value = Number(promotion.discount_value || 0);
  const discount =
    promotion.discount_type === "percent" ? subtotal * (value / 100) : value;
  return Math.min(subtotal, Math.max(0, discount));
};

const optionalOrderColumns = [
  "note",
  "subtotal",
  "discount_amount",
  "coupon_code",
  "promotion_id",
  "fulfillment",
  "fulfillment_type",
  "scheduled_for",
  "addons",
  "service_fee",
  "service_fee_label",
  "coupon_redeemed_at",
  "payment_method",
  "payment_status",
  "mercado_pago_payment_id",
  "loyalty_discount",
];

const getMissingSchemaColumn = (message: string) =>
  optionalOrderColumns.find((column) => message.includes(`'${column}' column`));

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartLoaded, total, clear, removeById } = useCart();
  const isMobile = useMediaQuery("(max-width: 760px)");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [note, setNote] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<OrderFulfillmentType>("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Promotion | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

  const [checkoutState, setCheckoutState] = useState<CheckoutState>("form");
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(PIX_WAIT_SECONDS);
  const [error, setError] = useState("");

  const [storeOpen, setStoreOpen] = useState(true);
  const [manualOpen, setManualOpen] = useState(true);
  const [averageTime, setAverageTime] = useState("35 a 50 min");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(weeklyBusinessHours);
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings | null>(null);
  const [availableAddons, setAvailableAddons] = useState(getCheckoutAddons(null));
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartNotice, setCartNotice] = useState("");
  const [scheduledOrderCounts, setScheduledOrderCounts] = useState<Record<string, number>>({});

  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyStatus | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const serviceFee = getServiceFee(operationalSettings);
  const serviceFeeLabel = getServiceFeeLabel(operationalSettings);
  const pickupSlots = buildPickupSlots(operationalSettings);
  const slotLimit = getOrderSlotLimit(operationalSettings);
  const selectedAddonList = availableAddons
    .map((addon) => ({ ...addon, quantity: selectedAddons[addon.id] || 0 }))
    .filter((addon) => addon.quantity > 0);
  const addonTotal = selectedAddonList.reduce(
    (sum, addon) => sum + Number(addon.unit_price || 0) * addon.quantity,
    0
  );
  const discountAmount = calculateDiscount(appliedCoupon, total);
  const loyaltyDiscount = loyaltyStatus?.eligibleNow ? LOYALTY_DISCOUNT_VALUE : 0;
  const finalTotal = Math.max(0, total + addonTotal + serviceFee - discountAmount - loyaltyDiscount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    async function fetchStoreStatus() {
      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      const savedBusinessHours = getBusinessHours(data?.business_hours);
      const manuallyOpen = data?.is_open !== false;
      const settings = data as OperationalSettings | null;
      setOperationalSettings(settings);
      setAvailableAddons(getCheckoutAddons(settings));
      setBusinessHours(savedBusinessHours);
      setManualOpen(manuallyOpen);
      setAverageTime(data?.average_time || "35 a 50 min");
      setStoreOpen(
        data
          ? isStoreAcceptingOrders(manuallyOpen, new Date(), savedBusinessHours)
          : isWithinBusinessHours(new Date(), savedBusinessHours)
      );
      const [firstSlot] = buildPickupSlots(data as OperationalSettings | null);
      if (firstSlot) {
        setScheduledFor((current) => current || toLocalInputValue(firstSlot));
      }
    }
    fetchStoreStatus();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStoreOpen(isStoreAcceptingOrders(manualOpen, new Date(), businessHours));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [manualOpen, businessHours]);

  useEffect(() => {
    async function fetchScheduledCounts() {
      const { data } = await supabase
        .from("orders")
        .select("scheduled_for,payment_status")
        .not("scheduled_for", "is", null)
        .in("payment_status", ["pendente", "pago"]);

      const counts: Record<string, number> = {};
      (data || []).forEach((order: { scheduled_for?: string | null; payment_status?: string | null }) => {
        if (!order.scheduled_for || order.payment_status === "falhou") return;
        const key = toLocalInputValue(new Date(order.scheduled_for));
        counts[key] = (counts[key] || 0) + 1;
      });
      setScheduledOrderCounts(counts);
    }

    fetchScheduledCounts();
  }, []);

  useEffect(() => {
    async function fetchMenuAvailability() {
      const { data } = await supabase
        .from("menu")
        .select("id,name,active,available,unavailable,availability_status");
      if (data) setMenuItems(data as MenuItem[]);
    }
    fetchMenuAvailability();
  }, []);

  useEffect(() => {
    if (!menuItems.length || !cart.length) return;
    const unavailableCartItems = cart.filter((cartItem) => {
      const menuItem = menuItems.find((item) => item.id === cartItem.id);
      return !isItemOrderable(menuItem);
    });
    if (unavailableCartItems.length === 0) return;
    unavailableCartItems.forEach((item) => removeById(item.id));
    const timer = window.setTimeout(() => {
      setCartNotice(
        unavailableCartItems.length === 1
          ? `${unavailableCartItems[0].name} foi removido do carrinho porque está pausado ou indisponível.`
          : "Alguns itens foram removidos do carrinho porque estão pausados ou indisponíveis."
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cart, menuItems, removeById]);

  useEffect(() => {
    const digits = onlyDigits(phone);
    if (![10, 11].includes(digits.length)) {
      const timer = window.setTimeout(() => setLoyaltyStatus(null), 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoyaltyLoading(true);
      try {
        const res = await fetch("/api/customer/loyalty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setLoyaltyStatus(data as LoyaltyStatus);
        }
      } catch {
        if (!cancelled) setLoyaltyStatus(null);
      } finally {
        if (!cancelled) setLoyaltyLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phone]);

  useEffect(() => {
    if (!pendingOrderId || checkoutState !== "awaiting_pix") return;
    let redirected = false;
    const markAsPaid = () => {
      if (redirected) return;
      redirected = true;
      setCheckoutState("paid");
      clear();
      setTimeout(() => router.push(`/pedido/${pendingOrderId}`), 2200);
    };

    const channel = supabase
      .channel(`checkout-payment-${pendingOrderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${pendingOrderId}` },
        (payload) => {
          if (payload.new.payment_status === "pago") {
            markAsPaid();
          }
        }
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("payment_status")
        .eq("id", pendingOrderId)
        .maybeSingle();

      if (data?.payment_status === "pago") {
        markAsPaid();
      }
    }, 4000);

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [pendingOrderId, checkoutState, clear, router]);

  useEffect(() => {
    if (checkoutState !== "awaiting_pix") return;

    const countdown = window.setInterval(() => {
      setPixCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(countdown);
  }, [checkoutState, pendingOrderId]);

  const selectedSlotIsAvailable =
    fulfillmentType !== "scheduled" ||
    (Boolean(scheduledFor) &&
      pickupSlots.some((slot) => toLocalInputValue(slot) === scheduledFor) &&
      (slotLimit <= 0 || (scheduledOrderCounts[scheduledFor] || 0) < slotLimit));
  const isFormValid =
    cart.length > 0 &&
    hasFirstAndLastName(name) &&
    [10, 11].includes(onlyDigits(phone).length) &&
    storeOpen &&
    selectedSlotIsAvailable;
  const withinBusinessHours = isWithinBusinessHours(new Date(), businessHours);
  const formHelp = !storeOpen
    ? !manualOpen
      ? "A loja está fechada manualmente."
      : !withinBusinessHours
        ? `Fora do horário de funcionamento. ${getNextOpeningLabel(new Date(), businessHours)}.`
        : "Os pedidos estão bloqueados até a loja reabrir."
    : !hasFirstAndLastName(name)
      ? "Informe nome e sobrenome para continuar."
      : ![10, 11].includes(onlyDigits(phone).length)
        ? "Informe um telefone com DDD."
        : !selectedSlotIsAvailable
          ? "Escolha um horário de retirada disponível."
          : "Tudo certo para enviar o pedido.";

  const insertOrder = async (extra: Record<string, unknown>) => {
    const base: Record<string, unknown> = {
      name: normalizeName(name),
      phone: formatPhone(phone),
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity,
        modifiers: i.modifiers?.length ? i.modifiers : undefined,
      })),
      note: note.trim(),
      subtotal: total,
      discount_amount: discountAmount,
      loyalty_discount: loyaltyDiscount,
      total: finalTotal,
      coupon_code: appliedCoupon?.code || null,
      promotion_id: appliedCoupon?.id || null,
      fulfillment: "retirada",
      fulfillment_type: fulfillmentType,
      scheduled_for:
        fulfillmentType === "scheduled" && scheduledFor
          ? new Date(scheduledFor).toISOString()
          : null,
      addons: selectedAddonList,
      service_fee: serviceFee,
      service_fee_label: serviceFeeLabel,
    };
    const payload: Record<string, unknown> = { ...base, ...extra };

    for (let attempt = 0; attempt <= optionalOrderColumns.length; attempt += 1) {
      const { data, error: insertError } = await supabase.from("orders").insert([payload]).select();
      if (!insertError && data?.[0]) return data[0];

      const missingColumn = getMissingSchemaColumn(insertError?.message || "");
      if (missingColumn && missingColumn in payload) {
        delete payload[missingColumn];
        continue;
      }

      throw new Error(insertError?.message || "Não foi possível criar o pedido.");
    }

    throw new Error("Não foi possível criar o pedido.");
  };

  const handlePixPayment = async () => {
    setError("");
    if (!isFormValid) {
      setError(storeOpen ? "Preencha os dados obrigatórios antes de continuar." : "A loja está fechada no momento.");
      return;
    }
    setCheckoutState("generating");
    try {
      const savedOrder = await insertOrder({ status: "aguardando_pagamento", payment_method: "pix", payment_status: "pendente" });
      setPendingOrderId(savedOrder.id);
      const pixRes = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalTotal, note: `Missô Sushi #${savedOrder.id}`, payer: { name: normalizeName(name), phone: onlyDigits(phone) } }),
      });
      const pixData = await pixRes.json();
      if (!pixRes.ok || !pixData.payment_id || (!pixData.qr_code_base64 && !pixData.qr_code)) {
        throw new Error(pixData.error || pixData.detail || "Não foi possível gerar o PIX.");
      }
      await supabase.from("orders").update({ mercado_pago_payment_id: String(pixData.payment_id) }).eq("id", savedOrder.id);
      setPixQr(pixData.qr_code_base64 || "");
      setPixCode(pixData.qr_code || "");
      setPixCountdown(PIX_WAIT_SECONDS);
      setCheckoutState("awaiting_pix");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o PIX.");
      setCheckoutState("form");
    }
  };

  const handleCardOrder = async () => {
    setError("");
    if (!isFormValid) {
      setError(storeOpen ? "Preencha os dados obrigatórios antes de continuar." : "A loja está fechada no momento.");
      return;
    }
    setCheckoutState("generating");
    try {
      const savedOrder = await insertOrder({
        status: "aguardando_pagamento",
        payment_method: "card",
        payment_status: "pendente",
      });
      const preferenceRes = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: savedOrder.id,
          amount: finalTotal,
          title: `Missô Sushi #${savedOrder.id}`,
          payer: { name: normalizeName(name), email: "cliente@email.com" },
        }),
      });
      const preferenceData = await preferenceRes.json();
      if (!preferenceRes.ok || !preferenceData.init_point) {
        throw new Error(preferenceData.error || preferenceData.detail || "Não foi possível iniciar o pagamento.");
      }
      const redirectUrl = String(preferenceData.init_point);
      window.setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento com cartão.");
      setCheckoutState("form");
    }
  };

  const handleCopyPix = async () => {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  const handleApplyCoupon = async () => {
    const code = sanitizeCoupon(couponCode);
    setCouponMessage("");
    setAppliedCoupon(null);
    if (!code) { setCouponMessage("Digite um cupom para aplicar."); return; }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: total }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponMessage(data.error || "Cupom inválido ou inativo."); return; }
      setCouponCode(data.code);
      setAppliedCoupon(data as Promotion);
      setCouponMessage(`Cupom aplicado: -${money(data.discount)}.`);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  };

  // ── PIX aguardando / pago ────────────────────────────────────────────────────
  if (checkoutState === "awaiting_pix" || checkoutState === "paid") {
    const isPaid = checkoutState === "paid";
    return (
      <main style={styles.page}>
        <section style={styles.pixState}>
          {isPaid ? (
            <div style={styles.pixConfirmedBox}>
              <p style={styles.eyebrow}>Missô Sushi</p>
              <h1 style={styles.pixTitle}>Pagamento confirmado!</h1>
              <p style={styles.pixConfirmedText}>
                Seu pedido foi liberado para preparo. Vamos abrir o acompanhamento agora.
              </p>
            </div>
          ) : (
            <div style={styles.pixHeader}>
              <p style={styles.eyebrow}>Missô Sushi</p>
              <h1 style={styles.pixTitle}>Pagamento PIX</h1>
              <p style={styles.muted}>
                Escaneie o QR Code ou copie o código. O pedido entra automaticamente quando o pagamento for confirmado.
              </p>
              <div style={styles.pixStatusBar}>
                <span style={styles.pixStatusDot} />
                <span>Atualizando status automaticamente</span>
                <strong>{formatCountdown(pixCountdown)}</strong>
              </div>
            </div>
          )}

          {!isPaid && (
            <div style={{ ...styles.pixPanel, ...(isMobile ? styles.pixPanelMobile : {}) }}>
              <div style={styles.pixQrBox}>
                {(pixCode || pixQr) && (
                  <div style={styles.qrImage}>
                    {pixCode ? (
                      <QRCodeSVG value={pixCode} size={220} level="M" includeMargin />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`data:image/png;base64,${pixQr}`} alt="QR Code PIX" width={220} height={220} />
                    )}
                  </div>
                )}
                <strong style={styles.pixAmount}>{money(finalTotal)}</strong>
                <span style={styles.pixHint}>
                  {pixCountdown > 0
                    ? "Aguardando confirmação do pagamento"
                    : "Se o PIX expirar, gere um novo pedido"}
                </span>
              </div>

              {pixCode && (
                <div style={styles.pixCodePanel}>
                  <label htmlFor="pixCode" style={styles.label}>Código copia e cola</label>
                  <textarea id="pixCode" value={pixCode} readOnly style={styles.codeArea} />
                  <button type="button" onClick={handleCopyPix} style={styles.copyPixButton}>
                    <span style={styles.copyPixIcon}>{showFeedback ? "✓" : "⧉"}</span>
                    <span>{showFeedback ? "Código PIX copiado" : "Copiar código PIX"}</span>
                  </button>
                  <p style={styles.pixInfoText}>
                    {pixCountdown > 0
                      ? "Depois do pagamento aprovado, esta tela confirma sozinha."
                      : "Se o tempo acabou, volte ao cardápio e gere um novo pedido PIX."}
                  </p>
                  {pendingOrderId && (
                    <Link href={`/pedido/${pendingOrderId}`} style={styles.orderLink}>
                      Acompanhar pedido →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ── Gerando ──────────────────────────────────────────────────────────────────
  if (checkoutState === "generating") {
    return (
      <main style={styles.page}>
        <section style={styles.progressState}>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>{method === "pix" ? "Gerando PIX..." : "Enviando pedido..."}</h1>
          <p style={styles.muted}>
            {method === "pix"
              ? "Estamos criando seu QR Code e reservando o pedido."
              : "Estamos registrando seu pedido para a cozinha."}
          </p>
          <div style={styles.progressBar}>
            <span style={styles.progressFill} />
          </div>
        </section>
      </main>
    );
  }

  // ── Carregando / vazio ───────────────────────────────────────────────────────
  if (!cartLoaded) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <p style={styles.eyebrow}>Checkout</p>
          <h1 style={styles.title}>Carregando pedido</h1>
          <p style={styles.muted}>Estamos recuperando os itens do seu carrinho.</p>
        </section>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <p style={styles.eyebrow}>Checkout</p>
          <h1 style={styles.title}>Seu carrinho está vazio</h1>
          <p style={styles.muted}>Volte ao cardápio e escolha seus pratos favoritos.</p>
          <Link href="/" style={styles.primaryLink}>Ver cardápio</Link>
        </section>
      </main>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <Link href="/" style={styles.backLink}>Voltar ao cardápio</Link>
        <div style={styles.headerTitle}>
          <p style={styles.eyebrow}>Missô Sushi</p>
          <h1 style={styles.title}>Finalizar pedido</h1>
        </div>
      </header>

      <div style={{ ...styles.shell, ...(isMobile ? styles.shellMobile : {}) }}>
        <section style={styles.mainColumn}>
          {/* Dados do cliente */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Dados para contato</h2>
            <div style={{ ...styles.formGrid, ...(isMobile ? styles.formGridMobile : {}) }}>
              <label style={styles.field}>
                <span style={styles.label}>Nome e sobrenome</span>
                <input
                  value={name}
                  onChange={(e) => setName(sanitizeName(e.target.value))}
                  onBlur={() => setName(normalizeName(name))}
                  autoComplete="name"
                  maxLength={30}
                  placeholder="NOME SOBRENOME"
                  style={styles.input}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Telefone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  style={styles.input}
                />
              </label>
            </div>
            <p style={{ ...styles.formHelp, ...(isFormValid ? styles.formHelpOk : {}) }}>{formHelp}</p>
          </div>

          {/* Retirada */}
          <div style={styles.card}>
            <div style={styles.inlineHeader}>
              <h2 style={styles.sectionTitle}>Retirada</h2>
              <span style={styles.inlineMeta}>Tempo médio: {averageTime}</span>
            </div>
            <div style={styles.scheduleChoice}>
              {(["asap", "scheduled"] as OrderFulfillmentType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFulfillmentType(option)}
                  style={{
                    ...styles.fulfillmentButton,
                    ...(fulfillmentType === option ? styles.fulfillmentButtonActive : {}),
                  }}
                >
                  {option === "asap" ? "Retirar o quanto antes" : "Agendar retirada"}
                </button>
              ))}
            </div>
            {fulfillmentType === "scheduled" && (
              <label style={styles.field}>
                <span style={styles.label}>Horário de retirada</span>
                <select
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  style={styles.select}
                >
                  {pickupSlots.map((slot) => {
                    const value = toLocalInputValue(slot);
                    const count = scheduledOrderCounts[value] || 0;
                    const full = slotLimit > 0 && count >= slotLimit;
                    return (
                      <option key={value} value={value} disabled={full}>
                        {formatPickupTime(slot.toISOString())}
                        {slotLimit > 0 ? ` - ${count}/${slotLimit} pedidos` : ""}
                        {full ? " - lotado" : ""}
                      </option>
                    );
                  })}
                </select>
                <p style={styles.mutedSmall}>
                  Grade de {getPickupSlotMinutes(operationalSettings)} em {getPickupSlotMinutes(operationalSettings)} minutos.
                </p>
              </label>
            )}
            {!storeOpen && (
              <p style={styles.error}>
                {manualOpen
                  ? `A loja está fechada no momento e ${getNextOpeningLabel(new Date(), businessHours)}.`
                  : `A loja está fechada manualmente e ${getNextOpeningLabel(new Date(), businessHours)}.`}
              </p>
            )}
          </div>

          {/* Complementos */}
          <details open style={styles.compactDetails}>
            <summary style={styles.detailsSummary}>
              Complementos <span>R$ 2,50 cada</span>
            </summary>
            <div style={styles.addonGrid}>
              {availableAddons.map((addon) => {
                const quantity = selectedAddons[addon.id] || 0;
                return (
                  <div key={addon.id} style={styles.addonRow}>
                    <span>
                      {addon.name}
                      <small style={styles.addonPrice}> {money(Number(addon.unit_price || 0))} cada</small>
                    </span>
                    <div style={styles.qtyControl}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAddons((current) => ({
                            ...current,
                            [addon.id]: Math.max(0, (current[addon.id] || 0) - 1),
                          }))
                        }
                        style={styles.qtyButton}
                      >
                        -
                      </button>
                      <strong>{quantity}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAddons((current) => ({
                            ...current,
                            [addon.id]: Math.min(9, (current[addon.id] || 0) + 1),
                          }))
                        }
                        style={styles.qtyButton}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>

          {/* Fidelidade */}
          {[10, 11].includes(onlyDigits(phone).length) && (
            <div style={styles.card}>
              <div style={styles.inlineHeader}>
                <h2 style={styles.sectionTitle}>Fidelidade</h2>
                {loyaltyStatus?.eligibleNow && (
                  <span style={styles.inlineMeta}>-{money(LOYALTY_DISCOUNT_VALUE)}</span>
                )}
              </div>
              {loyaltyLoading ? (
                <p style={styles.mutedSmall}>Consultando seu histórico...</p>
              ) : loyaltyStatus ? (
                <>
                  <p style={styles.mutedSmall}>
                    A cada {LOYALTY_ORDER_INTERVAL} pedidos pagos, você ganha R${" "}
                    {LOYALTY_DISCOUNT_VALUE.toFixed(0)} off.
                  </p>
                  <div style={styles.loyaltyProgressTrack}>
                    <span
                      style={{
                        ...styles.loyaltyProgressFill,
                        width: `${
                          loyaltyStatus.eligibleNow
                            ? 100
                            : (loyaltyStatus.progressInCycle / LOYALTY_ORDER_INTERVAL) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <p style={styles.loyaltyText}>
                    {loyaltyStatus.eligibleNow
                      ? `Parabéns! Este é seu ${loyaltyStatus.nextOrderNumber}º pedido — desconto de fidelidade aplicado.`
                      : `Você já fez ${loyaltyStatus.paidOrderCount} pedidos pagos. Faltam ${loyaltyStatus.ordersUntilReward} para o próximo desconto.`}
                  </p>
                </>
              ) : (
                <p style={styles.mutedSmall}>Não foi possível carregar o programa de fidelidade.</p>
              )}
            </div>
          )}

          {/* Cupom */}
          <div style={styles.card}>
            <div style={styles.inlineHeader}>
              <h2 style={styles.sectionTitle}>Cupom</h2>
              {appliedCoupon && <span style={styles.inlineMeta}>-{money(discountAmount)}</span>}
            </div>
            <div style={{ ...styles.couponRow, ...(isMobile ? styles.couponRowMobile : {}) }}>
              <input
                value={couponCode}
                onChange={(e) => { setCouponCode(sanitizeCoupon(e.target.value)); setCouponMessage(""); if (appliedCoupon) setAppliedCoupon(null); }}
                placeholder="CÓDIGO"
                disabled={couponLoading}
                style={styles.input}
              />
              {appliedCoupon ? (
                <button type="button" onClick={handleRemoveCoupon} style={styles.secondaryButton}>Remover</button>
              ) : (
                <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} style={styles.secondaryButton}>
                  {couponLoading ? "Aplicando..." : "Aplicar"}
                </button>
              )}
            </div>
            {couponMessage && (
              <p style={appliedCoupon ? styles.successText : styles.mutedSmall}>{couponMessage}</p>
            )}
          </div>

          {/* Observação */}
          <details open style={styles.compactDetails}>
            <summary style={styles.detailsSummary}>Observação do pedido</summary>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: sem cebolinha, enviar shoyu extra..." style={{ ...styles.textarea, ...styles.detailsContent }} />
          </details>

          {/* Pagamento */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Pagamento</h2>
            <div style={styles.methods}>
              {(["pix", "card"] as PaymentMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setMethod(option);
                    if (option === "pix") {
                      void handlePixPayment();
                    } else {
                      void handleCardOrder();
                    }
                  }}
                  disabled={!isFormValid}
                  style={{
                    ...styles.methodButton,
                    ...(method === option ? styles.methodButtonActive : {}),
                    ...(!isFormValid ? styles.methodButtonDisabled : {}),
                  }}
                >
                  <span style={styles.methodIcon}>{option === "pix" ? "◆" : "▣"}</span>
                  <span>{option === "pix" ? "PIX" : "Cartão"}</span>
                </button>
              ))}
            </div>
            {!isFormValid && <p style={styles.paymentWarning}>{formHelp}</p>}
            {method === "pix" && (
              <p style={{ ...styles.mutedSmall, marginTop: 14 }}>
                Clique em PIX para gerar o QR Code.
              </p>
            )}
            {method === "card" && (
              <p style={{ ...styles.mutedSmall, marginTop: 14 }}>
                Você será redirecionado ao Mercado Pago para pagar com cartão com segurança.
              </p>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}
        </section>

        <aside style={styles.summaryColumn}>
          <div style={styles.summaryCard}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Resumo</p>
                <h2 style={styles.cardTitle}>Seu pedido</h2>
              </div>
              <span style={styles.summaryPill}>{itemCount} itens</span>
            </div>
            {cartNotice && <p style={styles.noticeError}>{cartNotice}</p>}
            <div style={styles.orderList}>
              {cart.map((item) => (
                <div key={item.lineKey} style={styles.summaryOrderRow}>
                  <div>
                    <strong style={styles.itemName}>{item.quantity}x {item.name}</strong>
                    <p style={styles.summaryMuted}>{money(Number(item.price))} cada</p>
                  </div>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div style={styles.summaryTotalBox}>
              {(discountAmount > 0 || serviceFee > 0 || addonTotal > 0) && (
                <div style={styles.summaryTotalLine}>
                  <span>Subtotal</span>
                  <strong>{money(total)}</strong>
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
              {selectedAddonList.length > 0 && (
                <div style={styles.addonSummary}>
                  Complementos: {selectedAddonList.map((addon) => `${addon.quantity}x ${addon.name}`).join(", ")}
                </div>
              )}
              <div style={styles.addonSummary}>
                Retirada: {fulfillmentType === "scheduled" && scheduledFor ? formatPickupTime(new Date(scheduledFor).toISOString()) : "O quanto antes"}
              </div>
              <div style={styles.summaryGrandTotalLine}>
                <span>Total</span>
                <strong>{money(finalTotal)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f1ea", color: "#171512", padding: "20px 20px 48px" },
  pageMobile: { padding: "18px 14px 38px" },
  header: { maxWidth: 1180, margin: "0 auto 16px", position: "relative", display: "grid", justifyItems: "center", textAlign: "center", paddingTop: 18 },
  headerMobile: { paddingTop: 46 },
  headerTitle: { textAlign: "center" },
  backLink: { position: "absolute", left: 0, top: 18, color: "#8f1728", textDecoration: "none", fontSize: 14, fontWeight: 850, background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.08)", borderRadius: 999, padding: "9px 13px" },
  eyebrow: { color: "#9f1d2f", fontSize: 12, fontWeight: 850, textTransform: "uppercase" },
  title: { marginTop: 6, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1, fontWeight: 850 },
  shell: { maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 378px", gap: 20, alignItems: "start" },
  shellMobile: { gridTemplateColumns: "1fr" },
  mainColumn: { display: "grid", gap: 10 },
  summaryColumn: { position: "sticky", top: 20 },
  card: { background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.07)", borderRadius: 10, padding: 18, boxShadow: "0 8px 18px rgba(28, 26, 23, 0.035)" },
  summaryCard: { background: "#171512", color: "#fffdf8", border: "1px solid rgba(255, 253, 248, 0.08)", borderRadius: 8, padding: 22, boxShadow: "0 16px 36px rgba(23, 21, 18, 0.16)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 18 },
  cardEyebrow: { color: "#9f1d2f", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0 },
  cardTitle: { marginTop: 5, fontSize: 23, lineHeight: 1.12 },
  sectionTitle: { margin: "0 0 14px", fontSize: 20, lineHeight: 1.12 },
  inlineHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  inlineMeta: { borderRadius: 999, background: "#f0ebe2", color: "#625b53", padding: "7px 10px", fontSize: 12, fontWeight: 850, whiteSpace: "nowrap" },
  stepBadge: { display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, background: "#1c1a17", color: "#fffdf8", fontSize: 13, fontWeight: 850 },
  pill: { borderRadius: 999, background: "#eee8df", padding: "7px 10px", color: "#5d554c", fontSize: 13, fontWeight: 850, whiteSpace: "nowrap" },
  summaryPill: { borderRadius: 999, background: "rgba(255, 253, 248, 0.12)", padding: "7px 10px", color: "#fffdf8", fontSize: 13, fontWeight: 850, whiteSpace: "nowrap" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  formGridMobile: { gridTemplateColumns: "1fr" },
  formHelp: { marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 850, lineHeight: 1.4 },
  formHelpOk: { color: "#0f7a4a" },
  operationalInfoGrid: { marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, borderRadius: 8, background: "#f0ebe2", color: "#514a43", padding: "12px 14px", fontWeight: 850 },
  scheduleChoice: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 },
  fulfillmentButton: { border: "1px solid rgba(28, 26, 23, 0.1)", background: "#fff", borderRadius: 8, padding: 12, color: "#1c1a17", cursor: "pointer", fontWeight: 850 },
  fulfillmentButtonActive: { background: "#1c1a17", borderColor: "#1c1a17", color: "#fffdf8" },
  couponRow: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center" },
  couponRowMobile: { gridTemplateColumns: "1fr" },
  field: { display: "grid", gap: 7 },
  label: { display: "block", marginBottom: 8, fontSize: 14, fontWeight: 850 },
  input: { width: "100%", border: "1px solid rgba(28, 26, 23, 0.12)", borderRadius: 8, padding: "13px 14px", background: "#fff", color: "#1c1a17", outlineColor: "#9f1d2f", fontSize: 15 },
  select: { width: "100%", border: "1px solid rgba(28, 26, 23, 0.12)", borderRadius: 8, padding: "13px 14px", background: "#fff", color: "#1c1a17", outlineColor: "#9f1d2f", fontSize: 15 },
  textarea: { width: "100%", minHeight: 96, resize: "vertical", border: "1px solid rgba(28, 26, 23, 0.12)", borderRadius: 8, padding: "13px 14px", background: "#fff", color: "#1c1a17", outlineColor: "#9f1d2f", fontSize: 15 },
  compactDetails: { background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.07)", borderRadius: 10, padding: 16, boxShadow: "0 8px 18px rgba(28, 26, 23, 0.03)" },
  detailsSummary: { cursor: "pointer", fontSize: 17, fontWeight: 850, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  detailsContent: { marginTop: 12 },
  addonGrid: { display: "grid", gap: 10, marginTop: 12 },
  addonRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid rgba(28, 26, 23, 0.08)", borderRadius: 8, padding: "12px 14px", background: "#fff" },
  addonPrice: { display: "block", marginTop: 3, color: "#766e64", fontSize: 12, fontWeight: 750 },
  qtyControl: { display: "inline-flex", alignItems: "center", gap: 10 },
  qtyButton: { width: 30, height: 30, border: "none", borderRadius: 999, background: "#1c1a17", color: "#fffdf8", cursor: "pointer", fontWeight: 850 },
  methods: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  methodButton: { border: "1px solid rgba(28, 26, 23, 0.1)", background: "#fff", borderRadius: 8, padding: 15, color: "#1c1a17", cursor: "pointer", fontWeight: 850, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 6px 16px rgba(28, 26, 23, 0.04)" },
  methodButtonActive: { background: "#1c1a17", borderColor: "#1c1a17", color: "#fffdf8" },
  methodButtonDisabled: { opacity: 0.45, cursor: "not-allowed" },
  methodIcon: { fontSize: 15, lineHeight: 1 },
  paymentWarning: { marginTop: 12, borderRadius: 8, background: "#fff1f1", color: "#991b1b", padding: 12, fontSize: 13, fontWeight: 850, lineHeight: 1.4 },
  orderList: { display: "grid", gap: 13 },
  orderRow: { display: "flex", justifyContent: "space-between", gap: 18, paddingBottom: 13, borderBottom: "1px solid rgba(28, 26, 23, 0.08)" },
  itemName: { display: "block", lineHeight: 1.35 },
  totalBox: { display: "grid", gap: 10, marginTop: 18, padding: "16px 0 0", borderTop: "1px solid rgba(28, 26, 23, 0.1)" },
  totalLine: { display: "flex", justifyContent: "space-between", gap: 16, color: "#625b53", fontSize: 15 },
  grandTotalLine: { display: "flex", justifyContent: "space-between", gap: 16, color: "#1c1a17", fontSize: 22, fontWeight: 850 },
  summaryMuted: { marginTop: 4, color: "rgba(255, 253, 248, 0.68)", fontSize: 13, lineHeight: 1.4 },
  summaryOrderRow: { display: "flex", justifyContent: "space-between", gap: 18, paddingBottom: 13, borderBottom: "1px solid rgba(255, 253, 248, 0.12)" },
  summaryTotalBox: { display: "grid", gap: 10, marginTop: 18, padding: "0" },
  summaryTotalLine: { display: "flex", justifyContent: "space-between", gap: 16, color: "rgba(255, 253, 248, 0.78)", fontSize: 15 },
  summaryGrandTotalLine: { display: "flex", justifyContent: "space-between", gap: 16, color: "#fffdf8", fontSize: 22, fontWeight: 850 },
  addonSummary: { color: "rgba(255, 253, 248, 0.66)", fontSize: 13, lineHeight: 1.45 },
  discountText: { color: "#0f7a4a" },
  loyaltyProgressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    background: "#e7ded2",
    overflow: "hidden",
  },
  loyaltyProgressFill: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "#9f1d2f",
  },
  loyaltyText: { marginTop: 10, color: "#514a43", fontSize: 14, fontWeight: 750, lineHeight: 1.45 },
  muted: { color: "#625b53", lineHeight: 1.55 },
  mutedSmall: { marginTop: 4, color: "#766e64", fontSize: 13, lineHeight: 1.4 },
  noticeError: { borderRadius: 8, background: "#fee2e2", color: "#991b1b", padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 800, lineHeight: 1.4 },
  qrImage: { display: "grid", placeItems: "center", width: 238, height: 238, borderRadius: 8, border: "1px solid rgba(28, 26, 23, 0.08)", background: "#fff" },
  codeArea: { width: "100%", minHeight: 96, resize: "none", border: "1px solid rgba(28, 26, 23, 0.12)", borderRadius: 8, padding: 12, color: "#514a43", background: "#fff", lineHeight: 1.45 },
  secondaryButton: { border: "none", borderRadius: 999, background: "#1c1a17", color: "#fffdf8", padding: "12px 16px", cursor: "pointer", fontWeight: 850 },
  copyPixButton: { width: "100%", marginTop: 12, border: "none", borderRadius: 999, background: "#1c1a17", color: "#fffdf8", padding: "14px 18px", cursor: "pointer", fontWeight: 850, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 14px 26px rgba(28, 26, 23, 0.18)" },
  copyPixIcon: { width: 24, height: 24, borderRadius: 999, background: "rgba(255, 253, 248, 0.14)", display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1 },
  successText: { marginTop: 8, color: "#0f7a4a", fontWeight: 850 },
  error: { borderRadius: 8, background: "#fee2e2", color: "#991b1b", padding: 12, fontWeight: 800 },
  emptyState: { maxWidth: 640, margin: "0 auto", minHeight: "70vh", display: "grid", alignContent: "center", justifyItems: "start" },
  progressState: { maxWidth: 640, margin: "0 auto", minHeight: "70vh", display: "grid", alignContent: "center", justifyItems: "start", gap: 12 },
  progressBar: { width: "min(360px, 100%)", height: 8, borderRadius: 999, overflow: "hidden", background: "#e7ded2" },
  progressFill: { display: "block", width: "62%", height: "100%", borderRadius: 999, background: "#9f1d2f" },
  pixState: { maxWidth: 860, margin: "0 auto", minHeight: "78vh", display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center" },
  pixHeader: { maxWidth: 620, display: "grid", justifyItems: "center", gap: 10 },
  pixTitle: { marginTop: 8, fontSize: "clamp(34px, 7vw, 52px)", lineHeight: 1.02, fontWeight: 850 },
  pixPanel: { width: "100%", marginTop: 26, display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: 18, alignItems: "stretch", textAlign: "left" },
  pixPanelMobile: { gridTemplateColumns: "1fr", textAlign: "left" },
  pixQrBox: { background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.08)", borderRadius: 8, padding: 20, display: "grid", justifyItems: "center", alignContent: "center", gap: 10 },
  pixAmount: { marginTop: 4, fontSize: 24, color: "#1c1a17" },
  pixHint: { color: "#766e64", fontSize: 13, fontWeight: 800 },
  pixCodePanel: { background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.08)", borderRadius: 8, padding: 20, display: "grid", alignContent: "center" },
  pixStatusBar: { marginTop: 4, borderRadius: 999, background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.08)", padding: "9px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, color: "#514a43", fontSize: 13, fontWeight: 850, boxShadow: "0 10px 24px rgba(28, 26, 23, 0.06)" },
  pixStatusDot: { width: 9, height: 9, borderRadius: 999, background: "#16a34a", boxShadow: "0 0 0 5px rgba(22, 163, 74, 0.12)" },
  pixInfoText: { marginTop: 10, color: "#766e64", fontSize: 13, lineHeight: 1.4, textAlign: "center" },
  pixConfirmedBox: { maxWidth: 600, borderRadius: 8, background: "#fffdf8", border: "1px solid rgba(22, 163, 74, 0.22)", padding: 28, boxShadow: "0 18px 45px rgba(22, 163, 74, 0.1)" },
  pixConfirmedText: { marginTop: 12, color: "#0f7a4a", fontWeight: 850, lineHeight: 1.5 },
  orderLink: { marginTop: 14, color: "#625b53", fontWeight: 800, textDecoration: "none", textAlign: "center" },
  newOrderLink: { marginTop: 10, display: "inline-flex", justifyContent: "center", color: "#fffdf8", background: "#1c1a17", borderRadius: 999, padding: "12px 16px", fontWeight: 850, textDecoration: "none" },
  primaryLink: { marginTop: 22, display: "inline-flex", background: "#1c1a17", color: "#fffdf8", textDecoration: "none", borderRadius: 999, padding: "13px 18px", fontWeight: 850 },
};
