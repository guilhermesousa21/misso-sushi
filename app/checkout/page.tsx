"use client";

import type { CSSProperties, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  getBusinessHours,
  getNextOpeningLabel,
  getTodayBusinessHoursLabel,
  isWithinBusinessHours,
  weeklyBusinessHours,
  type BusinessHours,
} from "../../lib/storeHours";
import { useMediaQuery } from "../../lib/useMediaQuery";
import type { MenuItem } from "../../types";
import { useCart } from "../context/CartContext";

type PaymentMethod = "pix" | "card";

type Promotion = {
  id: number;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  active: boolean;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

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
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const sanitizeCoupon = (value: string) =>
  value
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 24)
    .toUpperCase();

const calculateDiscount = (promotion: Promotion | null, subtotal: number) => {
  if (!promotion || subtotal <= 0) return 0;

  const value = Number(promotion.discount_value || 0);
  const discount =
    promotion.discount_type === "percent" ? subtotal * (value / 100) : value;

  return Math.min(subtotal, Math.max(0, discount));
};

const isItemOrderable = (item?: MenuItem) =>
  Boolean(item) &&
  item?.active !== false &&
  item?.available !== false &&
  item?.unavailable !== true &&
  item?.availability_status !== "inativo" &&
  item?.availability_status !== "esgotado";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartLoaded, total, clear, remove } = useCart();
  const isMobile = useMediaQuery("(max-width: 760px)");
  const isTablet = useMediaQuery("(max-width: 980px)");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Promotion | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [pixPaymentId, setPixPaymentId] = useState<number | string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState("");
  const [storeOpen, setStoreOpen] = useState(true);
  const [manualOpen, setManualOpen] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(weeklyBusinessHours);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartNotice, setCartNotice] = useState("");
  const discountAmount = calculateDiscount(appliedCoupon, total);
  const finalTotal = Math.max(0, total - discountAmount);

  useEffect(() => {
    async function fetchStoreStatus() {
      const { data } = await supabase
        .from("store_settings")
        .select("is_open,business_hours")
        .limit(1)
        .maybeSingle();

      const manuallyOpen = data?.is_open !== false;
      const savedBusinessHours = getBusinessHours(data?.business_hours);
      setBusinessHours(savedBusinessHours);
      setManualOpen(manuallyOpen);
      setStoreOpen(manuallyOpen && isWithinBusinessHours(new Date(), savedBusinessHours));
    }

    fetchStoreStatus();
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

    unavailableCartItems.forEach((item) => remove(item.id));
    const timer = window.setTimeout(() => {
      setPixQr("");
      setPixCode("");
      setPixPaymentId(null);
      setCartNotice(
        unavailableCartItems.length === 1
          ? `${unavailableCartItems[0].name} foi removido do carrinho porque esta pausado ou indisponivel.`
          : "Alguns itens foram removidos do carrinho porque estao pausados ou indisponiveis."
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cart, menuItems, remove]);

  const canSubmit =
    cart.length > 0 &&
    hasFirstAndLastName(name) &&
    [10, 11].includes(onlyDigits(phone).length) &&
    method &&
    storeOpen &&
    !loading;

  const generatePix = async () => {
    try {
      setPixLoading(true);
      setPixQr("");
      setPixCode("");
      setError("");

      const res = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          note: `Pedido Misso Sushi - ${name || "Cliente"}`,
          payer: { name: normalizeName(name), phone: onlyDigits(phone) },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar PIX");

      setPixQr(data.qr_code_base64 || "");
      setPixCode(data.qr_code || "");
      setPixPaymentId(data.payment_id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");
    } finally {
      setPixLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    const code = sanitizeCoupon(couponCode);
    setCouponMessage("");
    setAppliedCoupon(null);

    if (!code) {
      setCouponMessage("Digite um cupom para aplicar.");
      return;
    }

    setCouponLoading(true);

    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();

      if (error || !data) {
        setCouponMessage("Cupom invalido ou inativo.");
        return;
      }

      const promotion = data as Promotion;
      const discount = calculateDiscount(promotion, total);
      if (discount <= 0) {
        setCouponMessage("Este cupom nao gera desconto para este pedido.");
        return;
      }

      setCouponCode(code);
      setAppliedCoupon(promotion);
      setPixQr("");
      setPixCode("");
      setPixPaymentId(null);
      setCouponMessage(`Cupom aplicado: -${money(discount)}.`);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    setPixQr("");
    setPixCode("");
    setPixPaymentId(null);
  };

  const handleCopyPix = async () => {
    await navigator.clipboard.writeText(pixCode);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(
        storeOpen
          ? "Preencha os dados obrigatorios antes de enviar o pedido."
          : "A loja esta fechada no momento."
      );
      return;
    }

    setLoading(true);

    const orderPayload = {
      name: normalizeName(name),
      phone: formatPhone(phone),
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
      })),
      note: note.trim(),
      subtotal: total,
      discount_amount: discountAmount,
      total: finalTotal,
      coupon_code: appliedCoupon?.code || null,
      promotion_id: appliedCoupon?.id || null,
      status: "recebido",
      payment_method: method,
      payment_status: "pendente",
      fulfillment: "retirada",
      mercado_pago_payment_id: pixPaymentId,
    };

    try {
      let { data, error: insertError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select();

      if (insertError) {
        const fallbackPayload = {
          name: orderPayload.name,
          phone: orderPayload.phone,
          items: orderPayload.items,
          note: [
            orderPayload.note,
            "Retirada no balcao",
            appliedCoupon ? `Cupom: ${appliedCoupon.code} (-${money(discountAmount)})` : "",
            `Pagamento: ${method.toUpperCase()} - pendente`,
          ]
            .filter(Boolean)
            .join("\n"),
          total: orderPayload.total,
          status: orderPayload.status,
          payment_method: orderPayload.payment_method,
        };

        const fallback = await supabase.from("orders").insert([fallbackPayload]).select();
        data = fallback.data;
        insertError = fallback.error;
      }

      if (insertError || !data?.[0]) {
        throw new Error(insertError?.message || "Nao foi possivel criar o pedido.");
      }

      fetch("/api/whatsapp/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data[0]),
      }).catch(() => {});

      clear();
      router.push(`/pedido/${data[0].id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar o pedido.");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 style={styles.title}>Seu carrinho esta vazio</h1>
          <p style={styles.muted}>Volte ao cardapio e escolha seus pratos favoritos.</p>
          <Link href="/" style={styles.primaryLink}>
            Ver cardapio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <Link href="/" style={styles.backLink}>
          Voltar ao cardapio
        </Link>
          <div>
            <p style={styles.eyebrow}>Misso Sushi</p>
            <h1 style={styles.title}>Finalizar pedido</h1>
            <p style={styles.mutedSmall}>
              {getTodayBusinessHoursLabel(new Date(), businessHours)}
            </p>
          </div>
      </header>

      <form onSubmit={handleSubmit} style={{ ...styles.shell, ...(isTablet ? styles.shellStack : {}) }}>
        <section style={styles.mainColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Cliente</p>
                <h2 style={styles.cardTitle}>Dados para contato</h2>
              </div>
            </div>
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
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Retirada</p>
                <h2 style={styles.cardTitle}>Pedido para retirar no balcao</h2>
              </div>
              <span style={styles.pill}>Sem entrega</span>
            </div>
            <p style={styles.muted}>Acompanhe o status pelo link do pedido e retire quando estiver pronto.</p>
            {!storeOpen && (
              <p style={styles.error}>
                {manualOpen
                  ? `A loja esta fechada no momento e ${getNextOpeningLabel(
                      new Date(),
                      businessHours
                    )}.`
                  : `A loja esta fechada manualmente e ${getNextOpeningLabel(
                      new Date(),
                      businessHours
                    )}.`}
              </p>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Resumo</p>
                <h2 style={styles.cardTitle}>Itens do pedido</h2>
              </div>
              <span style={styles.pill}>{cart.length} itens</span>
            </div>
            {cartNotice && <p style={styles.noticeError}>{cartNotice}</p>}
            <div style={styles.orderList}>
              {cart.map((item) => (
                <div key={item.id} style={styles.orderRow}>
                  <div>
                    <strong style={styles.itemName}>{item.quantity}x {item.name}</strong>
                    <p style={styles.mutedSmall}>{money(Number(item.price))} cada</p>
                  </div>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Cupom</p>
                <h2 style={styles.cardTitle}>Aplicar desconto</h2>
              </div>
              {appliedCoupon && <span style={styles.pill}>-{money(discountAmount)}</span>}
            </div>
            <div style={{ ...styles.couponRow, ...(isMobile ? styles.couponRowMobile : {}) }}>
              <input
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(sanitizeCoupon(event.target.value));
                  setCouponMessage("");
                  if (appliedCoupon) {
                    setAppliedCoupon(null);
                    setPixQr("");
                    setPixCode("");
                    setPixPaymentId(null);
                  }
                }}
                placeholder="CODIGO"
                disabled={couponLoading}
                style={styles.input}
              />
              {appliedCoupon ? (
                <button type="button" onClick={handleRemoveCoupon} style={styles.secondaryButton}>
                  Remover
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  style={styles.secondaryButton}
                >
                  {couponLoading ? "Aplicando..." : "Aplicar"}
                </button>
              )}
            </div>
            {couponMessage && (
              <p style={appliedCoupon ? styles.successText : styles.mutedSmall}>
                {couponMessage}
              </p>
            )}
          </div>

          <div style={styles.card}>
            <label htmlFor="note" style={styles.label}>Observacao geral</label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: sem cebolinha, enviar shoyu extra..." style={styles.textarea} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Pagamento</p>
                <h2 style={styles.cardTitle}>Escolha uma forma</h2>
              </div>
            </div>
            <div style={styles.methods}>
              {(["pix", "card"] as PaymentMethod[]).map((option) => (
                <button key={option} type="button" onClick={() => setMethod(option)} style={{ ...styles.methodButton, ...(method === option ? styles.methodButtonActive : {}) }}>
                  {option === "pix" ? "PIX" : "Cartao"}
                </button>
              ))}
            </div>

            {method === "pix" && (
              <div style={styles.paymentBox}>
                <button type="button" onClick={generatePix} disabled={pixLoading} style={styles.secondaryButton}>
                  {pixLoading ? "Gerando PIX..." : "Gerar PIX"}
                </button>
                {!pixLoading && pixQr && (
                  <div style={styles.qrWrap}>
                    <Image src={`data:image/png;base64,${pixQr}`} alt="QR Code PIX" width={220} height={220} style={styles.qrImage} />
                    <p style={styles.mutedSmall}>Escaneie o QR Code com o aplicativo do seu banco.</p>
                  </div>
                )}
                {!pixLoading && pixCode && (
                  <div style={styles.pixCodeBox}>
                    <label htmlFor="pixCode" style={styles.label}>Codigo copia e cola</label>
                    <textarea id="pixCode" value={pixCode} readOnly style={styles.codeArea} />
                    <button type="button" onClick={handleCopyPix} style={styles.secondaryButton}>Copiar codigo PIX</button>
                    {showFeedback && <p style={styles.successText}>Codigo PIX copiado.</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}
        </section>

        <aside style={{ ...styles.summaryCard, ...(isTablet ? styles.summaryCardStack : {}) }}>
          <p style={styles.cardEyebrow}>Total</p>
          <strong style={styles.total}>{money(finalTotal)}</strong>
          <div style={styles.divider} />
          <div style={styles.summaryLine}><span>Subtotal</span><strong>{money(total)}</strong></div>
          {discountAmount > 0 && (
            <div style={styles.summaryLine}><span>Desconto</span><strong>-{money(discountAmount)}</strong></div>
          )}
          <div style={styles.summaryLine}><span>Recebimento</span><strong>Retirada</strong></div>
          <div style={styles.summaryLine}><span>Pagamento</span><strong>{method.toUpperCase()}</strong></div>
          <button type="submit" disabled={!canSubmit} style={{ ...styles.checkoutButton, ...(!canSubmit ? styles.checkoutButtonDisabled : {}) }}>
            {loading ? "Enviando..." : "Enviar pedido"}
          </button>
        </aside>
      </form>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f7f4ef", color: "#1c1a17", padding: "28px 20px 56px" },
  pageMobile: { padding: "20px 14px 42px" },
  header: { maxWidth: 1120, margin: "0 auto 24px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end" },
  headerMobile: { display: "grid", alignItems: "start", justifyContent: "stretch" },
  backLink: { color: "#9f1d2f", textDecoration: "none", fontWeight: 800 },
  eyebrow: { color: "#9f1d2f", fontSize: 13, fontWeight: 850, textTransform: "uppercase" },
  title: { marginTop: 6, fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1, fontWeight: 850 },
  shell: { maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", gap: 18, alignItems: "start" },
  shellStack: { gridTemplateColumns: "1fr" },
  mainColumn: { display: "grid", gap: 16 },
  card: { background: "#fffdf8", border: "1px solid rgba(28, 26, 23, 0.08)", borderRadius: 8, padding: 20, boxShadow: "0 14px 35px rgba(28, 26, 23, 0.06)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 16 },
  cardEyebrow: { color: "#9f1d2f", fontSize: 12, fontWeight: 850, textTransform: "uppercase" },
  cardTitle: { marginTop: 4, fontSize: 24, lineHeight: 1.1 },
  pill: { borderRadius: 999, background: "#f0ebe2", padding: "7px 10px", color: "#625b53", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  formGridMobile: { gridTemplateColumns: "1fr" },
  couponRow: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center" },
  couponRowMobile: { gridTemplateColumns: "1fr" },
  field: { display: "grid", gap: 7 },
  label: { display: "block", marginBottom: 8, fontWeight: 850 },
  input: { width: "100%", border: "1px solid rgba(28, 26, 23, 0.14)", borderRadius: 8, padding: 12, background: "#fff", color: "#1c1a17", outlineColor: "#9f1d2f" },
  textarea: { width: "100%", minHeight: 110, resize: "vertical", border: "1px solid rgba(28, 26, 23, 0.14)", borderRadius: 8, padding: 12, background: "#fff", color: "#1c1a17", outlineColor: "#9f1d2f" },
  methods: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  methodButton: { border: "1px solid rgba(28, 26, 23, 0.12)", background: "#fff", borderRadius: 999, padding: 14, color: "#1c1a17", cursor: "pointer", fontWeight: 850 },
  methodButtonActive: { background: "#1c1a17", borderColor: "#1c1a17", color: "#fffdf8" },
  orderList: { display: "grid", gap: 12 },
  orderRow: { display: "flex", justifyContent: "space-between", gap: 18, paddingBottom: 12, borderBottom: "1px solid rgba(28, 26, 23, 0.08)" },
  itemName: { display: "block", lineHeight: 1.35 },
  muted: { color: "#625b53", lineHeight: 1.55 },
  mutedSmall: { marginTop: 4, color: "#766e64", fontSize: 13, lineHeight: 1.4 },
  noticeError: { borderRadius: 8, background: "#fee2e2", color: "#991b1b", padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 800, lineHeight: 1.4 },
  paymentBox: { marginTop: 18, borderTop: "1px solid rgba(28, 26, 23, 0.08)", paddingTop: 18 },
  qrWrap: { marginTop: 14, display: "grid", justifyItems: "start", gap: 10 },
  qrImage: { borderRadius: 8, border: "1px solid rgba(28, 26, 23, 0.08)" },
  pixCodeBox: { marginTop: 16 },
  codeArea: { width: "100%", minHeight: 88, resize: "vertical", border: "1px solid rgba(28, 26, 23, 0.14)", borderRadius: 8, padding: 12, color: "#514a43", background: "#f7f4ef" },
  secondaryButton: { marginTop: 10, border: "none", borderRadius: 999, background: "#1c1a17", color: "#fffdf8", padding: "12px 16px", cursor: "pointer", fontWeight: 850 },
  successText: { marginTop: 8, color: "#0f7a4a", fontWeight: 850 },
  error: { borderRadius: 8, background: "#fee2e2", color: "#991b1b", padding: 12, fontWeight: 800 },
  summaryCard: { position: "sticky", top: 24, background: "#1c1a17", color: "#fffdf8", borderRadius: 8, padding: 22, boxShadow: "0 18px 45px rgba(28, 26, 23, 0.18)" },
  summaryCardStack: { position: "static", order: -1 },
  total: { display: "block", margin: "10px 0", fontSize: 38, lineHeight: 1 },
  divider: { height: 1, background: "rgba(255, 253, 248, 0.16)", margin: "18px 0" },
  summaryLine: { display: "flex", justifyContent: "space-between", marginTop: 10, color: "#d8d0c4", gap: 12 },
  checkoutButton: { width: "100%", marginTop: 20, border: "none", borderRadius: 999, background: "#9f1d2f", color: "#fff", padding: 15, cursor: "pointer", fontWeight: 850, fontSize: 16 },
  checkoutButtonDisabled: { opacity: 0.45, cursor: "not-allowed" },
  emptyState: { maxWidth: 640, margin: "0 auto", minHeight: "70vh", display: "grid", alignContent: "center", justifyItems: "start" },
  primaryLink: { marginTop: 22, display: "inline-flex", background: "#1c1a17", color: "#fffdf8", textDecoration: "none", borderRadius: 999, padding: "13px 18px", fontWeight: 850 },
};
