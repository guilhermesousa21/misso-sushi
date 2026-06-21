"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBrasiliaDateTimeShort } from "../../../lib/brasiliaTime";
import { supabase } from "../../../lib/supabase";
import { useIsMobile } from "../../../lib/useMediaQuery";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  money,
  normalize,
  number,
  type AdminOrder,
} from "../AdminShell";

type CustomerRow = {
  phone: string;
  name: string;
  orders: AdminOrder[];
  total: number;
  favoriteItem: string;
  lastOrder: AdminOrder;
};

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "pago")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      setOrders(
        (data || []).map((order) => ({
          ...(order as AdminOrder),
          items: Array.isArray((order as AdminOrder).items)
            ? (order as AdminOrder).items
            : [],
        }))
      );
      setLoading(false);
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const customers = useMemo<CustomerRow[]>(() => {
    const grouped = new Map<string, AdminOrder[]>();
    orders.forEach((order) => {
      const phone = (order.phone || "Sem telefone").trim();
      grouped.set(phone, [...(grouped.get(phone) || []), order]);
    });

    return Array.from(grouped.entries())
      .map(([phone, customerOrders]) => {
        const itemCounts = new Map<string, number>();
        customerOrders.forEach((order) =>
          (order.items || []).forEach((item) => {
            itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + (item.quantity ?? 1));
          })
        );
        const favoriteItem =
          Array.from(itemCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        const lastOrder = customerOrders[0];

        return {
          phone,
          name: lastOrder.name || "Cliente",
          orders: customerOrders,
          total: customerOrders.reduce((sum, order) => sum + calcTotal(order), 0),
          favoriteItem,
          lastOrder,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return (
          new Date(b.lastOrder.created_at).getTime() - new Date(a.lastOrder.created_at).getTime()
        );
      });
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        normalize(customer.name).includes(query) ||
        normalize(customer.phone).includes(query) ||
        normalize(customer.favoriteItem).includes(query)
    );
  }, [customers, search]);

  const summary = useMemo(() => {
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.total, 0);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.orders.length, 0);
    return {
      averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalOrders,
      totalRevenue,
    };
  }, [customers]);

  return (
    <AdminShell
      eyebrow="Relacionamento"
      title="Clientes"
      action={
        <span style={styles.pill}>
          {loading ? "Carregando" : `${number(filteredCustomers.length)} clientes`}
        </span>
      }
    >
      <section style={{ ...localStyles.summaryStrip, ...(isMobile ? localStyles.summaryStripMobile : {}) }}>
        <div style={localStyles.summaryItem}>
          <span>Receita total</span>
          <strong>{money(summary.totalRevenue)}</strong>
        </div>
        <div style={localStyles.summaryItem}>
          <span>Pedidos</span>
          <strong>{number(summary.totalOrders)}</strong>
        </div>
        <div style={localStyles.summaryItem}>
          <span>Ticket médio</span>
          <strong>{money(summary.averageTicket)}</strong>
        </div>
      </section>

      <section style={{ ...localStyles.panel, ...(isMobile ? localStyles.panelMobile : {}) }}>
        <div style={{ ...localStyles.panelHeader, ...(isMobile ? localStyles.panelHeaderMobile : {}) }}>
          <div>
            <p style={styles.cardEyebrow}>Base</p>
            <h2 style={styles.cardTitle}>Lista de clientes</h2>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nome ou telefone"
            style={{ ...styles.input, ...localStyles.searchInput }}
            aria-label="Buscar clientes"
          />
        </div>

        {!isMobile && filteredCustomers.length > 0 && (
          <div style={localStyles.tableHead}>
            <span>Cliente</span>
            <span>Pedidos</span>
            <span>Total gasto</span>
            <span>Último pedido</span>
          </div>
        )}

        <div style={localStyles.list}>
          {filteredCustomers.map((customer, index) => (
            <Link
              key={customer.phone}
              href={`/admin/pedidos?cliente=${encodeURIComponent(customer.phone)}`}
              style={{
                ...localStyles.row,
                ...(isMobile ? localStyles.rowMobile : {}),
              }}
            >
              <div style={localStyles.rowMain}>
                {index < 3 && !search.trim() && (
                  <span
                    style={{
                      ...localStyles.rankDot,
                      ...(index === 0
                        ? localStyles.rankDotGold
                        : index === 1
                          ? localStyles.rankDotSilver
                          : localStyles.rankDotBronze),
                    }}
                  >
                    {index + 1}
                  </span>
                )}
                <div style={localStyles.rowIdentity}>
                  <strong style={localStyles.rowName}>{customer.name}</strong>
                  <span style={localStyles.rowPhone}>{customer.phone}</span>
                  {isMobile && (
                    <span style={localStyles.rowMeta}>
                      {number(customer.orders.length)} pedidos · Último{" "}
                      {formatCustomerDate(customer.lastOrder.created_at)}
                    </span>
                  )}
                </div>
              </div>
              {!isMobile && (
                <>
                  <span style={localStyles.rowStat}>{number(customer.orders.length)}</span>
                  <strong style={localStyles.rowTotal}>{money(customer.total)}</strong>
                  <span style={localStyles.rowDate}>
                    {formatCustomerDate(customer.lastOrder.created_at)}
                  </span>
                </>
              )}
              {isMobile && <strong style={localStyles.rowTotalMobile}>{money(customer.total)}</strong>}
            </Link>
          ))}

          {loading && <p style={localStyles.muted}>Carregando clientes...</p>}
          {!loading && filteredCustomers.length === 0 && (
            <EmptyState text="Nenhum cliente encontrado para a busca atual." />
          )}
        </div>
      </section>
    </AdminShell>
  );
}

const formatCustomerDate = formatBrasiliaDateTimeShort;

const localStyles: Record<string, CSSProperties> = {
  summaryStrip: {
    display: "flex",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  summaryStripMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  summaryItem: {
    flex: "1 1 160px",
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: "14px 16px",
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  panel: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: "18px 20px 8px",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.04)",
  },
  panelMobile: {
    padding: "14px 12px 6px",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  panelHeaderMobile: {
    display: "grid",
    alignItems: "stretch",
    gap: 12,
  },
  searchInput: {
    width: "min(100%, 320px)",
    minWidth: 200,
    background: "#fff",
  },
  tableHead: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) 80px 120px 140px",
    gap: 12,
    padding: "0 14px 10px",
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  list: {
    display: "grid",
    gap: 2,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) 80px 120px 140px",
    gap: 12,
    alignItems: "center",
    padding: "14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "inherit",
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.06)",
  },
  rowMobile: {
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "start",
  },
  rowMain: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  rankDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
    background: "#f0ebe2",
    color: "#514a43",
  },
  rankDotGold: {
    background: "#fef3c7",
    color: "#92400e",
  },
  rankDotSilver: {
    background: "#e5e7eb",
    color: "#374151",
  },
  rankDotBronze: {
    background: "#ffedd5",
    color: "#9a3412",
  },
  rowIdentity: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },
  rowName: {
    fontSize: 16,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowPhone: {
    color: "#766e64",
    fontSize: 13,
  },
  rowMeta: {
    color: "#766e64",
    fontSize: 12,
    lineHeight: 1.35,
  },
  rowStat: {
    color: "#625b53",
    fontSize: 14,
    fontWeight: 750,
  },
  rowTotal: {
    fontSize: 15,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  rowTotalMobile: {
    fontSize: 16,
    fontWeight: 850,
    whiteSpace: "nowrap",
    alignSelf: "center",
  },
  rowDate: {
    color: "#766e64",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  muted: {
    color: "#766e64",
    padding: "12px 14px",
  },
};
