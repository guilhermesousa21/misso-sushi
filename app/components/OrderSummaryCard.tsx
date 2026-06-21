import type { CSSProperties } from "react";
import { money } from "../../lib/orderUtils";

export type OrderSummaryCardItem = {
  key: string;
  quantity: number;
  name: string;
  unitPrice: number;
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
}: OrderSummaryCardProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const showSubtotal = discountAmount > 0 || serviceFee > 0 || addonTotal > 0;

  return (
    <div style={styles.summaryCard}>
      <div style={styles.cardHeader}>
        <div>
          <p style={styles.cardEyebrow}>{eyebrow}</p>
          <h2 style={styles.cardTitle}>{title}</h2>
        </div>
        <span style={styles.summaryPill}>
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>
      </div>

      {notice ? <p style={styles.noticeError}>{notice}</p> : null}

      <div style={styles.orderList}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.key} style={styles.summaryOrderRow}>
              <div>
                <strong style={styles.itemName}>
                  {item.quantity}x {item.name}
                </strong>
                <p style={styles.summaryMuted}>{money(item.unitPrice)} cada</p>
              </div>
              <strong>{money(item.unitPrice * item.quantity)}</strong>
            </div>
          ))
        ) : (
          <p style={styles.summaryMuted}>{emptyItemsText}</p>
        )}
      </div>

      <div style={styles.summaryTotalBox}>
        {showSubtotal && (
          <div style={styles.summaryTotalLine}>
            <span>Subtotal</span>
            <strong>{money(itemsSubtotal)}</strong>
          </div>
        )}
        {addonTotal > 0 && (
          <>
            <div style={styles.summaryTotalLine}>
              <span>Complementos</span>
              <strong>{money(addonTotal)}</strong>
            </div>
            <div style={styles.addonSummaryList}>
              {addons.map((addon) => (
                <div key={addon.key} style={styles.addonSummary}>
                  {addon.quantity}x {addon.name}
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
        <div style={styles.summaryGrandTotalLine}>
          <span>Total</span>
          <strong>{money(grandTotal)}</strong>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  summaryCard: {
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
    margin: 0,
  },
  cardTitle: {
    marginTop: 5,
    marginBottom: 0,
    fontSize: 23,
    lineHeight: 1.12,
    fontWeight: 850,
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
    margin: "0 0 12px",
    color: "#ffb4b4",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.4,
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
    fontWeight: 850,
  },
  summaryMuted: {
    marginTop: 4,
    marginBottom: 0,
    color: "rgba(255, 253, 248, 0.68)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  summaryTotalBox: {
    display: "grid",
    gap: 10,
    marginTop: 18,
    padding: 0,
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
  addonSummaryList: {
    display: "grid",
    gap: 4,
  },
  addonSummary: {
    color: "rgba(255, 253, 248, 0.66)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  discountText: {
    color: "#0f7a4a",
  },
};
