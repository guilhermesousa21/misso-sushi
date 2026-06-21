import type { CSSProperties } from "react";
import { getReceiptViewModel, receiptMoney } from "../../lib/orderReceipt";
import type { PrintableOrder } from "../../lib/printOrder";

export function OrderReceipt({ order }: { order: PrintableOrder }) {
  const receipt = getReceiptViewModel(order);

  return (
    <div style={styles.receipt}>
      <header style={styles.header}>
        <h1 style={styles.brand}>Misso Sushi</h1>
        <h2 style={styles.orderTitle}>Pedido #{receipt.id}</h2>
        <p style={styles.muted}>{receipt.createdAtLabel}</p>
      </header>

      <section style={styles.section}>
        <ReceiptLine label="Cliente" value={receipt.customerName} />
        <ReceiptLine label="Telefone" value={receipt.phone} />
        <ReceiptLine label="Retirada" value={receipt.pickupLabel} />
        <ReceiptLine label="Status" value={receipt.status} />
      </section>

      <section style={styles.section}>
        <strong style={styles.sectionTitle}>Itens</strong>
        <table style={styles.table}>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.key}>
                <td style={styles.itemCell}>
                  <strong style={styles.itemLabel}>{item.label}</strong>
                  {item.unitPriceLabel ? (
                    <span style={styles.itemUnit}>{item.unitPriceLabel}</span>
                  ) : null}
                </td>
                <td style={styles.itemTotal}>{item.lineTotalLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {receipt.note ? (
        <section style={styles.section}>
          <strong style={styles.sectionTitle}>Observações</strong>
          <p style={styles.note}>{receipt.note}</p>
        </section>
      ) : null}

      {receipt.addonText ? (
        <section style={styles.section}>
          <strong style={styles.sectionTitle}>Complementos</strong>
          <p style={styles.note}>{receipt.addonText}</p>
        </section>
      ) : null}

      <section style={styles.section}>
        <ReceiptTotalLine label="Pagamento" value={receipt.paymentLabel} strongValue />
        <ReceiptTotalLine label="Subtotal" value={receipt.subtotalLabel} strongValue />
        {receipt.addonTotalLabel ? (
          <ReceiptTotalLine label="Complementos" value={receipt.addonTotalLabel} strongValue />
        ) : null}
        {receipt.serviceFee > 0 ? (
          <ReceiptTotalLine
            label={receipt.serviceFeeLabel}
            value={receiptMoney(receipt.serviceFee)}
            strongValue
          />
        ) : null}
        {receipt.discount > 0 ? (
          <ReceiptTotalLine
            label={receipt.discountLabel}
            value={`-${receiptMoney(receipt.discount)}`}
            strongValue
          />
        ) : null}
        {receipt.loyaltyDiscount > 0 ? (
          <ReceiptTotalLine
            label="Fidelidade"
            value={`-${receiptMoney(receipt.loyaltyDiscount)}`}
            strongValue
          />
        ) : null}
        <ReceiptTotalLine label="Total" value={receipt.totalLabel} grand />
      </section>
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.line}>
      <strong>{label}</strong>
      <span style={styles.lineValue}>{value}</span>
    </div>
  );
}

function ReceiptTotalLine({
  label,
  value,
  strongValue = false,
  grand = false,
}: {
  label: string;
  value: string;
  strongValue?: boolean;
  grand?: boolean;
}) {
  return (
    <div style={{ ...styles.line, ...(grand ? styles.grandLine : {}) }}>
      <span>{label}</span>
      <strong style={strongValue ? styles.strongValue : undefined}>{value}</strong>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  receipt: {
    width: "100%",
    maxWidth: 360,
    margin: 0,
    background: "#fff",
    color: "#111",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 13,
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    padding: 18,
  },
  header: {
    textAlign: "center",
    borderBottom: "1px solid #111",
    paddingBottom: 10,
    marginBottom: 12,
  },
  brand: {
    margin: 0,
    fontSize: 21,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  orderTitle: {
    margin: "6px 0 0",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  muted: {
    margin: "6px 0 0",
    color: "#444",
    fontSize: 12,
  },
  section: {
    borderBottom: "1px dashed #777",
    padding: "10px 0",
  },
  sectionTitle: {
    display: "block",
    marginBottom: 6,
  },
  line: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    margin: "4px 0",
    alignItems: "flex-start",
  },
  lineValue: {
    textAlign: "right",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 6,
  },
  itemCell: {
    borderBottom: "1px dashed #bbb",
    padding: "7px 0",
    verticalAlign: "top",
  },
  itemLabel: {
    display: "block",
    lineHeight: 1.35,
    fontWeight: 700,
  },
  itemUnit: {
    display: "block",
    marginTop: 2,
    color: "#555",
    fontSize: 12,
    fontWeight: 400,
  },
  itemTotal: {
    borderBottom: "1px dashed #bbb",
    padding: "7px 0",
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
    fontWeight: 700,
    width: 88,
  },
  note: {
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.45,
  },
  strongValue: {
    fontWeight: 700,
  },
  grandLine: {
    fontSize: 18,
    fontWeight: 800,
    marginTop: 4,
  },
};
