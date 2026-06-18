"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import {
  AdminShell,
  EmptyState,
  adminStyles as styles,
  calcTotal,
  formatDateTime,
  money,
  normalize,
  number,
  type AdminOrder,
} from "../AdminShell";

type Customer = {
  key: string;
  name: string;
  phone: string;
  orders: AdminOrder[];
  totalSpent: number;
  lastOrder: string;
};

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recentes");
  const isTablet = useMediaQuery("(max-width: 1040px)");

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "pago")
        .order("created_at", { ascending: false });

      if (mounted) {
        setOrders(
          (data || [])
            .filter((order) => (order as AdminOrder).payment_status === "pago")
            .map((order) => ({
              ...(order as AdminOrder),
              items: Array.isArray((order as AdminOrder).items)
                ? (order as AdminOrder).items
                : [],
            }))
        );
        setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const customers = useMemo(() => {
    const grouped = new Map<string, Customer>();

    orders.forEach((order) => {
      const phone = (order.phone || "").trim();
      const name = (order.name || "Cliente").trim();
      const key = phone || normalize(name) || String(order.id);
      const current =
        grouped.get(key) ||
        ({
          key,
          name,
          phone,
          orders: [],
          totalSpent: 0,
          lastOrder: order.created_at,
        } satisfies Customer);

      current.name = current.name === "Cliente" ? name : current.name;
      current.phone = current.phone || phone;
      current.orders.push(order);
      current.totalSpent += calcTotal(order);
      if (new Date(order.created_at) > new Date(current.lastOrder)) {
        current.lastOrder = order.created_at;
      }
      grouped.set(key, current);
    });

    const query = normalize(search.trim());

    return Array.from(grouped.values())
      .filter(
        (customer) =>
          !query ||
          normalize(customer.name).includes(query) ||
          normalize(customer.phone).includes(query)
      )
      .sort((a, b) => {
        if (sort === "valor") return b.totalSpent - a.totalSpent;
        if (sort === "pedidos") return b.orders.length - a.orders.length;
        return new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime();
      });
  }, [orders, search, sort]);

  const metrics = useMemo(() => {
    const totalSpent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const repeatCustomers = customers.filter((customer) => customer.orders.length > 1).length;
    const averageValue = customers.length > 0 ? totalSpent / customers.length : 0;

    return { averageValue, repeatCustomers, totalSpent };
  }, [customers]);

  return (
    <AdminShell
      eyebrow="Relacionamento"
      title="Clientes"
      action={<span style={styles.pill}>{loading ? "Carregando" : `${number(customers.length)} cliente(s)`}</span>}
    >
      <section style={styles.metrics}>
        <Metric label="Clientes" value={number(customers.length)} detail="Com pedidos registrados" />
        <Metric label="Recorrentes" value={number(metrics.repeatCustomers)} detail="Mais de um pedido" />
        <Metric label="Receita da base" value={money(metrics.totalSpent)} detail="Dentro dos filtros" />
        <Metric label="Média por cliente" value={money(metrics.averageValue)} detail="Valor acumulado médio" />
      </section>

      <section style={{ ...styles.toolbar, ...(isTablet ? styles.toolbarStack : {}) }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cliente ou telefone"
          style={styles.input}
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          style={styles.select}
        >
          <option value="recentes">Mais recentes</option>
          <option value="valor">Maior valor</option>
          <option value="pedidos">Mais pedidos</option>
        </select>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.cardEyebrow}>Base</p>
            <h2 style={styles.cardTitle}>Histórico por cliente</h2>
          </div>
        </div>

        {customers.map((customer) => (
          <article key={customer.key} style={localStyles.customerRow}>
            <div>
              <strong>{customer.name}</strong>
              <p style={styles.mutedSmall}>{customer.phone || "Telefone não informado"}</p>
              <p style={styles.mutedSmall}>Ultimo pedido: {formatDateTime(customer.lastOrder)}</p>
            </div>
            <div style={localStyles.customerStats}>
              <span>{number(customer.orders.length)} pedido(s)</span>
              <strong>{money(customer.totalSpent)}</strong>
            </div>
          </article>
        ))}

        {!loading && customers.length === 0 && (
          <EmptyState text="Nenhum cliente encontrado para os filtros atuais." />
        )}
      </section>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      <span style={styles.metricDetail}>{detail}</span>
    </article>
  );
}

const localStyles: Record<string, CSSProperties> = {
  customerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 14,
    padding: "14px 0",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  customerStats: {
    display: "grid",
    justifyItems: "end",
    gap: 5,
    color: "#514a43",
  },
};
