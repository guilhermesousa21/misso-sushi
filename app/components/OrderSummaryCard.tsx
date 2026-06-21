import type { CSSProperties } from "react";
import { formatItemModifiers } from "../../lib/itemModifiers";
import { money } from "../../lib/orderUtils";

export type OrderSummaryCardItem = {
  key: string;
  quantity: number;
  name: string;
  unitPrice: number;
  modifiers?: string[] | null;
};

export type OrderSummaryCardAddon = {
  key: string;
  quantity: number;
  name: string;
};

type OrderSummaryCardProps = {
  items: OrderSummaryCardItem[];
  addons?: OrderSummaryCardAddon[];
  itemsSubtotal: number;
  addonTotal?: number;
  serviceFee?: number;
  serviceFeeLabel?: string;
  discountAmount?: number;
  loyaltyDiscount?: number;
  grandTotal: number;
  eyebrow?: string;
  title?: string;
  emptyItemsText?: string;
  notice?: string | null;
  variant?: "dark" | "light";
};

export function OrderSummaryCard({
  items,
  addons = [],
  itemsSubtotal,
  addonTotal = 0,
  serviceFee = 0,
  serviceFeeLabel = "Taxa de embalagem",
  discountAmount = 0,
  loyaltyDiscount = 0,
  grandTotal,
  eyebrow = "Resumo",
  title = "Seu pedido",
  emptyItemsText = "Nenhum item neste pedido.",
  notice,
  variant = "dark",
}: OrderSummaryCardProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const showSubtotal = discountAmount > 0 || serviceFee > 0 || addonTotal > 0;
  const palette = variant === "light" ? lightStyles : darkStyles;

  return (
    <div style={palette.summaryCard}>
      <div style={sharedStyles.cardHeader}>
        <div>
          <p style={sharedStyles.cardEyebrow}>{eyebrow}</p>
          <h2 style={sharedStyles.cardTitle}>{title}</h2>
        </div>
        <span style={palette.summaryPill}>
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>
      </div>

      {notice ? <p style={palette.noticeError}>{notice}</p> : null}

      <div style={sharedStyles.orderList}>
        {items.length > 0 ? (
          items.map((item) => {
            const modifierText = formatItemModifiers(item.modifiers);

            return (
              <div key={item.key} style={palette.summaryOrderRow}>
                <div>
                  <strong style={sharedStyles.itemName}>
                    {item.quantity}x {item.name}
                  </strong>
                  {modifierText ? (
                    <p style={palette.itemModifiers}>{modifierText}</p>
                  ) : null}
                  <p style={palette.summaryMuted}>{money(item.unitPrice)} cada</p>
                </div>
                <strong>{money(item.unitPrice * item.quantity)}</strong>
              </div>
            );
          })
        ) : (
          <p style={palette.summaryMuted}>{emptyItemsText}</p>
        )}
      </div>

      <div style={sharedStyles.summaryTotalBox}>
        {showSubtotal && (
          <div style={palette.summaryTotalLine}>
            <span>Subtotal</span>
            <strong>{money(itemsSubtotal)}</strong>
          </div>
        )}
        {addonTotal > 0 && (
          <>
            <div style={palette.summaryTotalLine}>
              <span>Complementos</span>
              <strong>{money(addonTotal)}</strong>
            </div>
            <div style={sharedStyles.addonSummaryList}>
              {addons.map((addon) => (
                <div key={addon.key} style={palette.addonSummary}>
                  {addon.quantity}x {addon.name}
                </div>
              ))}
            </div>
          </>
        )}
        {serviceFee > 0 && (
          <div style={palette.summaryTotalLine}>
            <span>{serviceFeeLabel}</span>
            <strong>{money(serviceFee)}</strong>
          </div>
        )}
        {discountAmount > 0 && (
          <div style={palette.summaryTotalLine}>
            <span>Desconto cupom</span>
            <strong style={sharedStyles.discountText}>-{money(discountAmount)}</strong>
          </div>
        )}
        {loyaltyDiscount > 0 && (
          <div style={palette.summaryTotalLine}>
            <span>Fidelidade</span>
            <strong style={sharedStyles.discountText}>-{money(loyaltyDiscount)}</strong>
          </div>
        )}
        <div style={palette.summaryGrandTotalLine}>
          <span>Total</span>
          <strong>{money(grandTotal)}</strong>
        </div>
      </div>
    </div>
  );
}

const sharedStyles: Record<string, CSSProperties> = {
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
    margin: 0,
  },
  cardTitle: {
    marginTop: 5,
    marginBottom: 0,
    fontSize: 23,
    lineHeight: 1.12,
    fontWeight: 850,
  },
  noticeError: {
    margin: "0 0 12px",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.4,
  },
  orderList: {
    display: "grid",
    gap: 13,
  },
  itemName: {
    display: "block",
    lineHeight: 1.35,
    fontWeight: 850,
  },
  summaryTotalBox: {
    display: "grid",
    gap: 10,
    marginTop: 18,
    padding: 0,
  },
  addonSummaryList: {
    display: "grid",
    gap: 4,
  },
  discountText: {
    color: "#0f7a4a",
  },
};

const darkStyles: Record<string, CSSProperties> = {
  summaryCard: {
    background: "#171512",
    color: "#fffdf8",
    border: "1px solid rgba(255, 253, 248, 0.08)",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 16px 36px rgba(23, 21, 18, 0.16)",
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
  noticeError: {
    ...sharedStyles.noticeError,
    color: "#ffb4b4",
  },
  summaryOrderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 13,
    borderBottom: "1px solid rgba(255, 253, 248, 0.12)",
  },
  summaryMuted: {
    marginTop: 4,
    marginBottom: 0,
    color: "rgba(255, 253, 248, 0.68)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  itemModifiers: {
    marginTop: 3,
    marginBottom: 0,
    color: "rgba(255, 253, 248, 0.58)",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "rgba(255, 253, 248, 0.78)",
    fontSize: 15,
    fontWeight: 750,
  },
  summaryGrandTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#fffdf8",
    fontSize: 22,
    fontWeight: 850,
  },
  addonSummary: {
    color: "rgba(255, 253, 248, 0.66)",
    fontSize: 13,
    lineHeight: 1.45,
  },
};

const lightStyles: Record<string, CSSProperties> = {
  summaryCard: {
    background: "#fff",
    color: "#1c1a17",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 8px 18px rgba(28, 26, 23, 0.04)",
  },
  summaryPill: {
    borderRadius: 999,
    background: "#f0ebe2",
    padding: "7px 10px",
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  noticeError: {
    ...sharedStyles.noticeError,
    color: "#991b1b",
  },
  summaryOrderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 13,
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  summaryMuted: {
    marginTop: 4,
    marginBottom: 0,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.4,
  },
  itemModifiers: {
    marginTop: 3,
    marginBottom: 0,
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#625b53",
    fontSize: 15,
    fontWeight: 750,
  },
  summaryGrandTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#1c1a17",
    fontSize: 22,
    fontWeight: 850,
  },
  addonSummary: {
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.45,
  },
};
