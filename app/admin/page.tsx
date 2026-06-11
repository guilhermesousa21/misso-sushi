"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

type Order = {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
  payment_method: string;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("mes");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data as Order[]);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", padding: 24, background: "#f5f5f5" }}>
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            background: "#fff",
            padding: 24,
            borderRadius: 20,
            textAlign: "center",
          }}
        >
          <p>Carregando dados...</p>
        </div>
      </main>
    );
  }

  // Filtro
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    const date = new Date(o.created_at);
    if (filter === "hoje") return date.toDateString() === now.toDateString();
    if (filter === "semana") {
      const weeksAgo = new Date();
      weeksAgo.setDate(now.getDate() - 7 * selectedWeek);
      return date >= weeksAgo;
    }
    if (filter === "mes")
      return (
        date.getMonth() === selectedMonth &&
        date.getFullYear() === selectedYear
      );
    if (filter === "ano") return date.getFullYear() === selectedYear;
    return true;
  });

  const faturamentoTotal = filteredOrders.reduce((acc, o) => acc + o.total, 0);

  const faturamentoPorDia: Record<string, number> = {};
  filteredOrders.forEach((o) => {
    const dia = new Date(o.created_at).toLocaleDateString("pt-BR");
    faturamentoPorDia[dia] = (faturamentoPorDia[dia] || 0) + o.total;
  });

  const chartDataBar = {
    labels: Object.keys(faturamentoPorDia),
    datasets: [
      {
        label: "Faturamento diário",
        data: Object.values(faturamentoPorDia),
        backgroundColor: "#16a34a", // verde igual aos valores
        borderColor: "#15803d",
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f5f5f5" }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          background: "#fff",
          padding: 32,
          borderRadius: 20,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
          📊 Painel Administrativo
        </h1>

        {/* Filtros */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          {/* Hoje */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FilterButton active={filter === "hoje"} onClick={() => setFilter("hoje")} text="Hoje" fullWidth />
          </div>

          {/* Semana */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FilterButton active={filter === "semana"} onClick={() => setFilter("semana")} text="Semana" fullWidth />
            {filter === "semana" && (
              <Dropdown>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  style={{
                    marginTop: 8,
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    width: 160,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {[1, 2, 3, 4].map((w) => (
                    <option key={w} value={w}>
                      Últimas {w} semanas
                    </option>
                  ))}
                </select>
              </Dropdown>
            )}
          </div>

          {/* Mês */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FilterButton active={filter === "mes"} onClick={() => setFilter("mes")} text="Mês" fullWidth />
            {filter === "mes" && (
              <Dropdown>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{
                    marginTop: 8,
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    width: 160,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString("pt-BR", { month: "long" })}
                    </option>
                  ))}
                </select>
              </Dropdown>
            )}
          </div>

          {/* Ano */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FilterButton active={filter === "ano"} onClick={() => setFilter("ano")} text="Ano" fullWidth />
            {filter === "ano" && (
              <Dropdown>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{
                    marginTop: 8,
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    width: 160,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </Dropdown>
            )}
          </div>
        </div>

        {/* Cards resumo */}
        <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
          <Card title="📦 Pedidos" value={filteredOrders.length} color="#16a34a" />
          <Card title="💰 Faturamento" value={`R$ ${faturamentoTotal.toFixed(2)}`} color="#16a34a" />
        </div>

        {/* Gráfico */}
        <div style={{ background: "#f9fafb", borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>📈 Faturamento por dia</h2>
          <Bar data={chartDataBar} />
        </div>

        {/* Histórico */}
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>📜 Histórico de pedidos</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#eff6ff", color: "#1e3a8a" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Forma de Pagamento</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o) => (
                <tr key={o.id}>
                  <td style={tdStyle}>{o.id}</td>
                  <td style={tdStyle}>{o.customer_name || "-"}</td>
                  <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 600 }}>
                    R$ {o.total.toFixed(2)}
                  </td>
                  <td style={tdStyle}>{o.payment_method || "-"}</td>
                  <td style={tdStyle}>
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24, gap: 8 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background:
                  page === p
                    ? "linear-gradient(to right, #2563eb, #3b82f6)"
                    : "#f3f4f6",
                color: page === p ? "#fff" : "#374151",
                boxShadow: page === p ? "0 2px 6px rgba(37,99,235,0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

/* Card de resumo */
function Card({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#f9fafb",
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

/* Botão de filtro */
function FilterButton({
  active,
  onClick,
  text,
  fullWidth,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        width: fullWidth ? 160 : "auto",
        background: active
          ? "linear-gradient(to right, #2563eb, #3b82f6)"
          : "#f3f4f6",
        color: active ? "#fff" : "#374151",
        boxShadow: active ? "0 2px 6px rgba(37,99,235,0.4)" : "none",
        transition: "all 0.3s ease",
      }}
    >
      {text}
    </button>
  );
}

/* Dropdown com animação suave */
function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        animation: "fadeSlide 0.3s ease",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

// CSS global para animação
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = `
    @keyframes fadeSlide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleTag);
}

const thStyle: React.CSSProperties = {
  padding: "12px",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  border: "1px solid #e5e7eb",
};
