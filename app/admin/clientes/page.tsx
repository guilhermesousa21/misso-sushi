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

type Customer = {
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

  return (
    <AdminShell
      eyebrow="Relacionamento"
      title="Clientes"
      action={<span style={styles.pill}>{loading ? "Carregando" : `${number(filteredCustomers.length)} clientes`}</span>}
    >
      <section style={{ ...localStyles.toolbar, ...(isMobile ? localStyles.toolbarMobile : {}) }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, telefone ou item favorito"
          style={styles.input}
        />
      </section>

      <section style={localStyles.grid}>
        {filteredCustomers.map((customer) => (
          <article key={customer.phone} style={{ ...styles.card, ...(isMobile ? localStyles.cardMobile : {}) }}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardEyebrow}>Cliente</p>
                <h2 style={styles.cardTitle}>{customer.name}</h2>
                <p style={styles.mutedSmall}>{customer.phone}</p>
              </div>
              <span style={styles.pill}>{number(customer.orders.length)} pedidos</span>
            </div>

            <div style={localStyles.metrics}>
              <div>
                <span>Total gasto</span>
                <strong>{money(customer.total)}</strong>
              </div>
              <div>
                <span>Favorito</span>
                <strong>{customer.favoriteItem}</strong>
              </div>
            </div>

            <Link href={`/admin/pedidos?cliente=${encodeURIComponent(customer.phone)}`} style={styles.primaryLink}>
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

const localStyles: Record<string, CSSProperties> = {
  toolbar: {
    marginBottom: 14,
  },
  toolbarMobile: {
    marginBottom: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
  },
  cardMobile: {
    padding: 14,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
};
