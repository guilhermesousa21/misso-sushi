"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { addDaysInBrasilia, toBrasiliaDateKey } from "../../../lib/brasiliaTime";
import { useIsMobile } from "../../../lib/useMediaQuery";
import FaturamentoInsights from "./FaturamentoInsights";
import PedidosSection from "./PedidosSection";
import { fat } from "./faturamentoStyles";
import { normalize, type AdminOrder } from "../AdminShell";

type DateRange = "today" | "7d" | "30d" | "all" | "custom";
type PageView = "painel" | "pedidos";

const dateRangeLabels: Record<DateRange, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Tudo",
  custom: "Período",
};

const getDateRangeStart = (range: DateRange) => {
  if (range === "all" || range === "custom") return "";
  if (range === "7d") return toBrasiliaDateKey(addDaysInBrasilia(new Date(), -6));
  if (range === "30d") return toBrasiliaDateKey(addDaysInBrasilia(new Date(), -29));
  return toBrasiliaDateKey(new Date());
};

const isPaidOrder = (order: AdminOrder) => order.payment_status === "pago";

export default function FaturamentoTab({ initialSearch = "" }: { initialSearch?: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<PageView>(initialSearch.trim() ? "pedidos" : "painel");
  const isMobile = useIsMobile();
  const hasClientFilter = Boolean(initialSearch.trim());

  useEffect(() => {
    setSearch(initialSearch);
    if (initialSearch.trim()) setView("pedidos");
  }, [initialSearch]);

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
        (data || [])
          .filter((order) => isPaidOrder(order as AdminOrder))
          .map((order) => ({
            ...(order as AdminOrder),
            items: Array.isArray((order as AdminOrder).items) ? (order as AdminOrder).items : [],
          }))
      );
      setLoading(false);
    }

    fetchOrders();

    const normalizeOrder = (raw: AdminOrder): AdminOrder => ({
      ...(raw as AdminOrder),
      items: Array.isArray((raw as AdminOrder).items) ? (raw as AdminOrder).items : [],
    });

    const channel = supabase
      .channel("admin-faturamento-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = normalizeOrder(payload.new as AdminOrder);
        if (!isPaidOrder(order)) return;
        setOrders((prev) => [order, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const order = normalizeOrder(payload.new as AdminOrder);
        setOrders((prev) => {
          if (!isPaidOrder(order)) return prev.filter((c) => c.id !== order.id);
          const exists = prev.some((c) => c.id === order.id);
          return exists
            ? prev.map((c) => (c.id === order.id ? order : c))
            : [order, ...prev];
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = normalize(search.trim());
    const rangeStart = dateRange === "custom" ? dateFrom : getDateRangeStart(dateRange);
    const rangeEnd = dateRange === "custom" ? dateTo : "";

    return orders.filter((order) => {
      const orderDate = toBrasiliaDateKey(order.created_at);
      const byDateStart = !rangeStart || orderDate >= rangeStart;
      const byDateEnd = !rangeEnd || orderDate <= rangeEnd;
      const bySearch =
        !query ||
        normalize(String(order.id)).includes(query) ||
        normalize(order.name || "").includes(query) ||
        normalize(order.phone || "").includes(query);
      return isPaidOrder(order) && byDateStart && byDateEnd && bySearch;
    });
  }, [dateFrom, dateRange, dateTo, orders, search]);

  const clearClientFilter = () => {
    router.push("/admin/faturamento");
    setSearch("");
  };

  const selectCustomer = (phone: string) => {
    router.push(`/admin/faturamento?cliente=${encodeURIComponent(phone)}`);
    setSearch(phone);
    setView("pedidos");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ ...fat.toolbar, ...(isMobile ? { top: 0, borderRadius: 14 } : {}) }}>
        <nav style={fat.viewSwitch} aria-label="Visualização">
          {(["painel", "pedidos"] as PageView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              style={{
                ...fat.viewBtn,
                ...(view === option ? fat.viewBtnActive : {}),
              }}
            >
              {option === "painel" ? "Painel" : "Pedidos"}
            </button>
          ))}
        </nav>

        <div style={fat.toolbarRight}>
          <div style={fat.periodPills} role="group" aria-label="Período">
            {(Object.keys(dateRangeLabels) as DateRange[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDateRange(option)}
                style={{
                  ...fat.periodBtn,
                  ...(dateRange === option ? fat.periodBtnActive : {}),
                }}
              >
                {dateRangeLabels[option]}
              </button>
            ))}
          </div>

          <label style={fat.searchWrap}>
            <span style={fat.searchIcon} aria-hidden="true">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedido ou cliente"
              style={fat.searchInput}
              aria-label="Buscar"
            />
          </label>
        </div>

        {dateRange === "custom" && (
          <div style={fat.customDates}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={fat.dateInput}
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={fat.dateInput}
              aria-label="Data final"
            />
          </div>
        )}

        {hasClientFilter && (
          <span style={fat.chip}>
            {initialSearch}
            <button type="button" onClick={clearClientFilter} style={fat.chipBtn} aria-label="Limpar filtro">
              ×
            </button>
          </span>
        )}
      </header>

      {view === "painel" ? (
        <FaturamentoInsights
          orders={filteredOrders}
          loading={loading}
          onSelectCustomer={selectCustomer}
        />
      ) : (
        <PedidosSection orders={filteredOrders} loading={loading} embedded />
      )}
    </div>
  );
}
