"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
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

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width: 760px)");

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

  const customers = useMemo(() => {
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
        const favoriteItem = Array.from(itemCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sem itens";
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
      .sort((a, b) => new Date(b.lastOrder.created_at).getTime() - new Date(a.lastOrder.created_at).getTime());
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
    const bestCustomer = [...customers].sort((a, b) => b.total - a.total)[0];

    return {
      averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      bestCustomer,
      totalOrders,
      totalRevenue,
    };
  }, [customers]);

  return (
    <AdminShell
      eyebrow="Relacionamento"
      title="Clientes"
      action={<span style={styles.pill}>{loading ? "Carregando" : `${number(filteredCustomers.length)} clientes`}</span>}
    >
      <section style={{ ...localStyles.summaryGrid, ...(isMobile ? localStyles.summaryGridMobile : {}) }}>
        <MetricCard label="Clientes" value={number(customers.length)} detail="com pedidos" />
        <MetricCard label="Pedidos" value={number(summary.totalOrders)} detail="no histórico" />
        <MetricCard label="Receita" value={money(summary.totalRevenue)} detail="clientes" />
        <MetricCard
          label="Ticket médio"
          value={money(summary.averageTicket)}
          detail={summary.bestCustomer ? `Maior cliente: ${summary.bestCustomer.name}` : "Sem pedidos"}
        />
      </section>

      <section style={{ ...localStyles.toolbar, ...(isMobile ? localStyles.toolbarMobile : {}) }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, telefone ou item favorito"
          style={{ ...styles.input, ...localStyles.searchInput }}
        />
        {search.trim() && (
          <button type="button" onClick={() => setSearch("")} style={localStyles.clearButton}>
            Limpar
          </button>
        )}
      </section>

      <section style={localStyles.grid}>
        {filteredCustomers.map((customer) => (
          <article key={customer.phone} style={{ ...styles.card, ...(isMobile ? localStyles.cardMobile : {}) }}>
            <div style={localStyles.customerHeader}>
              <span style={localStyles.avatar}>{customer.name.slice(0, 1).toUpperCase()}</span>
              <div style={localStyles.customerIdentity}>
                <h2 style={localStyles.customerName}>{customer.name}</h2>
                <p style={localStyles.customerPhone}>{customer.phone}</p>
              </div>
              <span style={localStyles.orderPill}>{number(customer.orders.length)} pedidos</span>
            </div>

            <div style={localStyles.metrics}>
              <div style={localStyles.metricBox}>
                <span>Total gasto</span>
                <strong>{money(customer.total)}</strong>
              </div>
              <div style={localStyles.metricBox}>
                <span>Favorito</span>
                <strong>{customer.favoriteItem}</strong>
              </div>
            </div>

            <div style={localStyles.lastOrder}>
              <span>Último pedido</span>
              <strong>{formatCustomerDate(customer.lastOrder.created_at)}</strong>
            </div>

            <Link href={`/admin/pedidos?cliente=${encodeURIComponent(customer.phone)}`} style={localStyles.customerLink}>
              Ver pedidos
            </Link>
          </article>
        ))}
        {!loading && filteredCustomers.length === 0 && (
          <EmptyState text="Nenhum cliente encontrado para a busca atual." />
        )}
      </section>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article style={localStyles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

const formatCustomerDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const localStyles: Record<string, CSSProperties> = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  summaryGridMobile: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  summaryCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: 14,
    display: "grid",
    gap: 6,
    boxShadow: "0 10px 24px rgba(28, 26, 23, 0.04)",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    marginBottom: 14,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: 10,
  },
  toolbarMobile: {
    gridTemplateColumns: "1fr",
    marginBottom: 10,
  },
  searchInput: {
    background: "#fff",
  },
  clearButton: {
    border: "none",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 850,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 12,
  },
  cardMobile: {
    padding: 14,
  },
  customerHeader: {
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  customerIdentity: {
    minWidth: 0,
  },
  customerName: {
    fontSize: 20,
    lineHeight: 1.12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  customerPhone: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
  },
  orderPill: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    borderRadius: 8,
    background: "#f7f4ef",
    padding: 10,
    display: "grid",
    gap: 4,
  },
  lastOrder: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#625b53",
    fontSize: 13,
    marginBottom: 14,
  },
  customerLink: {
    display: "inline-flex",
    justifyContent: "center",
    width: "100%",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "11px 14px",
    textDecoration: "none",
    fontWeight: 850,
  },
};
