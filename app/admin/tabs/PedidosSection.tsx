"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { printOrder } from "../../../lib/printOrder";
import { formatAddonSummary, formatPickupTime } from "../../../lib/orderFeatures";
import { formatOrderItemLabel } from "../../../lib/itemModifiers";
import { formatBrasiliaDateTimeShort } from "../../../lib/brasiliaTime";
import { useIsMobile } from "../../../lib/useMediaQuery";
import { fat } from "./faturamentoStyles";
import {
  EmptyState,
  calcTotal,
  money,
  number,
  type AdminOrder,
} from "../AdminShell";

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
};

const formatDisplayName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\b[\p{L}]/gu, (char) => char.toUpperCase());

function OrderCard({ order, isMobile }: { order: AdminOrder; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scheduled = order.fulfillment_type === "scheduled" && order.scheduled_for;
  const pickupLabel = scheduled ? formatPickupTime(order.scheduled_for!) : "Padrão";
  const paymentKey = order.payment_method || "";
  const paymentLabel = paymentLabels[paymentKey] || paymentKey || "—";
  const total = calcTotal(order);
  const addonSummary = formatAddonSummary(order.addons);

  return (
    <article
      style={{
        ...s.card,
        ...(open ? s.cardOpen : {}),
        ...(hovered && !open ? s.cardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...s.cardRow, ...(isMobile ? s.cardRowMobile : {}) }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ ...s.mainBtn, ...(isMobile ? s.mainBtnMobile : {}) }}
          aria-expanded={open}
        >
          <span style={s.idBadge}>#{order.id}</span>
          <div style={s.info}>
            <strong style={s.name}>{order.name ? formatDisplayName(order.name) : "Cliente"}</strong>
            <span style={s.phone}>{order.phone || "Sem telefone"}</span>
            <span style={s.date}>{formatBrasiliaDateTimeShort(order.created_at)}</span>
          </div>
          {!isMobile && (
            <div style={s.tags}>
              <span style={{ ...s.tag, ...(scheduled ? s.tagScheduled : s.tagDefault) }}>{pickupLabel}</span>
              <span style={{ ...s.tag, ...(paymentKey === "pix" ? s.tagPix : s.tagCard) }}>{paymentLabel}</span>
            </div>
          )}
          <strong style={s.total}>{money(total)}</strong>
          <span style={{ ...s.chevron, ...(open ? s.chevronOpen : {}) }} aria-hidden="true">
            ▼
          </span>
        </button>
        <button
          type="button"
          style={{ ...s.printBtn, ...(isMobile ? s.printBtnMobile : {}) }}
          onClick={() => printOrder(order)}
          aria-label={`Imprimir pedido ${order.id}`}
        >
          Imprimir
        </button>
      </div>

      {isMobile && (
        <div style={s.mobileTags}>
          <span style={{ ...s.tag, ...(scheduled ? s.tagScheduled : s.tagDefault) }}>{pickupLabel}</span>
          <span style={{ ...s.tag, ...(paymentKey === "pix" ? s.tagPix : s.tagCard) }}>{paymentLabel}</span>
        </div>
      )}

      {open && (
        <div style={s.details}>
          <div style={s.items}>
            {(order.items || []).length > 0 ? (
              (order.items || []).map((item, index) => (
                <div key={`${order.id}-${item.id}-${index}`} style={s.item}>
                  {formatOrderItemLabel(item)}
                </div>
              ))
            ) : (
              <span style={s.emptyText}>Sem itens registrados.</span>
            )}
          </div>
          {addonSummary && (
            <p style={s.note}>
              <strong>Complementos:</strong> {addonSummary}
            </p>
          )}
          {order.note?.trim() && (
            <p style={s.obs}>
              <strong>Obs:</strong> {order.note.trim()}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function PedidosSection({
  orders,
  loading,
  embedded = false,
}: {
  orders: AdminOrder[];
  loading: boolean;
  embedded?: boolean;
}) {
  const isMobile = useIsMobile();
  const revenue = orders.reduce((sum, order) => sum + calcTotal(order), 0);

  return (
    <section style={{ ...fat.panel, ...(embedded ? { marginTop: 0 } : {}) }}>
      <div style={fat.panelHeader}>
        <div>
          <h2 style={{ ...fat.panelTitle, fontSize: 17 }}>Histórico de pedidos</h2>
          <p style={fat.panelSubtitle}>
            {loading ? "Carregando..." : `${number(orders.length)} pedidos · ${money(revenue)}`}
          </p>
        </div>
        {!loading && orders.length > 0 && <span style={fat.panelBadge}>{number(orders.length)}</span>}
      </div>

      <div style={s.list}>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} isMobile={isMobile} />
        ))}
        {loading && <p style={fat.empty}>Carregando pedidos...</p>}
        {!loading && orders.length === 0 && (
          <EmptyState text="Nenhum pedido para os filtros atuais." />
        )}
      </div>
    </section>
  );
}

const s: Record<string, CSSProperties> = {
  list: { display: "grid", gap: 10 },
  card: {
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 8,
    overflow: "hidden",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  cardHover: {
    borderColor: "rgba(28, 26, 23, 0.12)",
    boxShadow: "0 4px 16px rgba(28, 26, 23, 0.06)",
  },
  cardOpen: {
    borderColor: "rgba(159, 29, 47, 0.25)",
    boxShadow: "0 8px 24px rgba(159, 29, 47, 0.08)",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "stretch",
  },
  cardRowMobile: { gridTemplateColumns: "1fr" },
  mainBtn: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto auto",
    gap: 12,
    alignItems: "center",
    border: "none",
    background: "transparent",
    padding: "14px 16px",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    minWidth: 0,
    width: "100%",
  },
  mainBtnMobile: {
    gridTemplateColumns: "auto minmax(0, 1fr) auto 26px",
    gap: 10,
    alignItems: "start",
  },
  idBadge: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 7,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  info: { minWidth: 0, display: "grid", gap: 2 },
  name: { fontSize: 14, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  phone: { fontSize: 12, color: "#625b53", fontWeight: 650 },
  date: { fontSize: 11, color: "#9a9288" },
  tags: { display: "flex", gap: 6, flexWrap: "wrap" },
  mobileTags: { display: "flex", gap: 6, padding: "0 16px 12px", flexWrap: "wrap" },
  tag: {
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 10,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  tagDefault: { background: "#f0ebe2", color: "#514a43" },
  tagScheduled: { background: "#fef3c7", color: "#92400e" },
  tagPix: { background: "#ecfdf5", color: "#0f7a4a" },
  tagCard: { background: "#eff6ff", color: "#1d4ed8" },
  total: { fontSize: 15, fontWeight: 900, whiteSpace: "nowrap" },
  chevron: {
    width: 26,
    height: 26,
    borderRadius: 999,
    background: "#f0ebe2",
    display: "grid",
    placeItems: "center",
    fontSize: 9,
    fontWeight: 900,
    color: "#625b53",
    transition: "transform 0.2s ease",
  },
  chevronOpen: { transform: "rotate(180deg)", background: "#fce8eb", color: "#9f1d2f" },
  printBtn: {
    border: "none",
    borderLeft: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffdf8",
    color: "#514a43",
    padding: "0 18px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    transition: "background 0.15s ease, color 0.15s ease",
  },
  printBtnMobile: {
    borderLeft: "none",
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    padding: "12px",
    width: "100%",
  },
  details: {
    borderTop: "1px dashed rgba(28, 26, 23, 0.1)",
    padding: "14px 16px 16px",
    background: "#fffdf8",
    display: "grid",
    gap: 10,
  },
  items: { display: "grid", gap: 6 },
  item: {
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.05)",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  note: { margin: 0, fontSize: 12, color: "#514a43", lineHeight: 1.45 },
  obs: {
    margin: 0,
    fontSize: 12,
    color: "#514a43",
    lineHeight: 1.45,
    borderLeft: "3px solid #9f1d2f",
    paddingLeft: 10,
  },
  emptyText: { color: "#9a9288", fontSize: 13 },
};
