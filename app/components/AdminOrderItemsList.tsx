import type { CSSProperties } from "react";
import { formatReceiptItemLine } from "../../lib/orderReceipt";
import { money } from "../../lib/orderUtils";

type OrderItem = {
  id?: number;
  name: string;
  price: number;
  quantity?: number | null;
  modifiers?: string[] | null;
};

type OrderAddon = {
  id?: string;
  name: string;
  quantity?: number | null;
  unit_price?: number | null;
};

export function AdminOrderItemsList({
  items = [],
  addons = [],
}: {
  items?: OrderItem[] | null;
  addons?: OrderAddon[] | null;
}) {
  const itemRows = (items || []).map((item, index) => {
    const quantity = item.quantity ?? 1;
    const unitPrice = Number(item.price || 0);

    return {
      key: `item-${item.id ?? index}`,
      label: formatReceiptItemLine(item),
      unitPriceLabel: `${money(unitPrice)} cada`,
    };
  });

  const addonRows = (addons || [])
    .filter((addon) => Number(addon.quantity || 0) > 0)
    .map((addon, index) => {
      const quantity = addon.quantity ?? 1;
      const unitPrice = Number(addon.unit_price || 0);

      return {
        key: `addon-${addon.id ?? index}`,
        label: `${quantity}x ${addon.name}`,
        unitPriceLabel: unitPrice > 0 ? `${money(unitPrice)} cada` : "",
      };
    });

  const rows = [...itemRows, ...addonRows];

  if (rows.length === 0) {
    return <p style={styles.empty}>Sem itens salvos neste pedido.</p>;
  }

  return (
    <div style={styles.list}>
      {rows.map((row) => (
        <div key={row.key} style={styles.row}>
          <div style={styles.rowMain}>
            <strong style={styles.label}>{row.label}</strong>
            {row.unitPriceLabel ? <span style={styles.meta}>{row.unitPriceLabel}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  list: {
    display: "grid",
  },
  row: {
    padding: "8px 14px",
    borderTop: "1px solid rgba(28, 26, 23, 0.06)",
  },
  rowMain: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },
  label: {
    color: "#1c1a17",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  meta: {
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
  },
  empty: {
    margin: 0,
    padding: "10px 14px",
    color: "#766e64",
    fontSize: 13,
    borderTop: "1px solid rgba(28, 26, 23, 0.06)",
  },
};
