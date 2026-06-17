"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { AdminShell, EmptyState, adminStyles as styles } from "../AdminShell";

type Promotion = {
  id?: number;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  active: boolean;
};

const emptyPromotion: Promotion = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  active: true,
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<Promotion>(emptyPromotion);
  const [message, setMessage] = useState("");
  const isTablet = useMediaQuery("(max-width: 1040px)");
  const isMobile = useMediaQuery("(max-width: 700px)");

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("id", { ascending: false });

    if (data) setPromotions(data as Promotion[]);
  }

  const activePromotions = useMemo(
    () => promotions.filter((promotion) => promotion.active).length,
    [promotions]
  );
  const pausedPromotions = promotions.length - activePromotions;

  const discountPreview =
    form.discount_type === "percent"
      ? `${Number(form.discount_value || 0)}%`
      : Number(form.discount_value || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  const canSubmit =
    form.code.trim().length > 0 && Number(form.discount_value || 0) > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      active: form.active,
    };

    if (!payload.code || payload.discount_value <= 0) {
      setMessage("Informe o codigo e um desconto maior que zero.");
      return;
    }

    const { error } = await supabase.from("promotions").insert([payload]);
    if (error) {
      setMessage("Crie a tabela promotions no Supabase para salvar promocoes.");
      return;
    }

    setForm(emptyPromotion);
    setMessage("Promocao criada com sucesso.");
    fetchPromotions();
  }

  async function togglePromotion(promotion: Promotion) {
    if (!promotion.id) return;
    await supabase.from("promotions").update({ active: !promotion.active }).eq("id", promotion.id);
    fetchPromotions();
  }

  return (
    <AdminShell eyebrow="Marketing" title="Promocoes">
      <section style={localStyles.metrics}>
        <Metric label="Cupons" value={String(promotions.length)} />
        <Metric label="Ativos" value={String(activePromotions)} />
        <Metric label="Pausados" value={String(pausedPromotions)} />
      </section>

      <section style={{ ...localStyles.layout, ...(isTablet ? localStyles.layoutStack : {}) }}>
        <form onSubmit={handleSubmit} style={localStyles.createPanel}>
          <div style={localStyles.panelHeader}>
            <div>
              <p style={styles.cardEyebrow}>Novo cupom</p>
              <h2 style={localStyles.panelTitle}>Criar promocao</h2>
            </div>
            <span style={form.active ? localStyles.statusActive : localStyles.statusPaused}>
              {form.active ? "Ativo" : "Pausado"}
            </span>
          </div>

          <div style={localStyles.formStack}>
            <label style={localStyles.field}>
              <span style={localStyles.label}>Codigo do cupom</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })
                }
                placeholder="EX: MISSO10"
                style={localStyles.codeInput}
              />
            </label>

            <label style={localStyles.field}>
              <span style={localStyles.label}>Descricao</span>
              <input
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Ex: desconto de inauguracao"
                style={styles.input}
              />
            </label>

            <div style={{ ...localStyles.discountGrid, ...(isMobile ? localStyles.discountGridStack : {}) }}>
              <label style={localStyles.field}>
                <span style={localStyles.label}>Tipo</span>
                <select
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      discount_type: event.target.value as Promotion["discount_type"],
                    })
                  }
                  style={styles.select}
                >
                  <option value="percent">Percentual</option>
                  <option value="fixed">Valor fixo</option>
                </select>
              </label>
              <label style={localStyles.field}>
                <span style={localStyles.label}>Desconto</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm({ ...form, discount_value: Number(event.target.value) })
                  }
                  style={styles.input}
                />
              </label>
            </div>

          </div>

          <div style={localStyles.preview}>
            <span>Previa</span>
            <strong>{form.code || "CODIGO"}</strong>
            <p>
              {discountPreview} de desconto
              {form.description ? ` - ${form.description}` : ""}
            </p>
          </div>

          {message && <p style={localStyles.message}>{message}</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{ ...styles.primaryLink, ...(!canSubmit ? localStyles.disabledButton : {}) }}
          >
            Criar promocao
          </button>
        </form>

        <article style={localStyles.listPanel}>
          <div style={localStyles.panelHeader}>
            <div>
              <p style={styles.cardEyebrow}>Cupons</p>
              <h2 style={localStyles.panelTitle}>Gerenciar cupons</h2>
            </div>
          </div>

          <div style={localStyles.couponList}>
            {promotions.map((promotion) => {
              const discount =
                promotion.discount_type === "percent"
                  ? `${promotion.discount_value}%`
                  : Number(promotion.discount_value || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    });

              return (
                <div
                  key={promotion.id || promotion.code}
                  style={{ ...localStyles.couponRow, ...(isMobile ? localStyles.couponRowStack : {}) }}
                >
                  <div style={localStyles.couponMain}>
                    <div style={localStyles.couponTopLine}>
                      <strong style={localStyles.couponCode}>{promotion.code}</strong>
                      <span
                        style={
                          promotion.active
                            ? localStyles.statusActiveSoft
                            : localStyles.statusPausedSoft
                        }
                      >
                        {promotion.active ? "Ativo" : "Pausado"}
                      </span>
                    </div>
                    <p style={localStyles.couponDescription}>
                      {promotion.description || "Sem descricao"}
                    </p>
                    <strong style={localStyles.discountValue}>{discount} de desconto</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePromotion(promotion)}
                    style={{
                      ...localStyles.actionButton,
                      ...(promotion.active ? localStyles.pauseButton : localStyles.activateButton),
                    }}
                  >
                    {promotion.active ? "Pausar" : "Ativar"}
                  </button>
                </div>
              );
            })}
          </div>

          {promotions.length === 0 && <EmptyState text="Nenhuma promocao cadastrada." />}
        </article>
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article style={localStyles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const localStyles: Record<string, CSSProperties> = {
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 16,
    display: "grid",
    gap: 8,
    color: "#625b53",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(300px, 420px) minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
  },
  layoutStack: {
    gridTemplateColumns: "1fr",
  },
  createPanel: {
    background: "#1c1a17",
    color: "#fffdf8",
    borderRadius: 8,
    padding: 20,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.16)",
  },
  listPanel: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 14,
    marginBottom: 16,
  },
  panelTitle: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  formStack: { display: "grid", gap: 12, marginBottom: 14 },
  field: { display: "grid", gap: 7 },
  label: { fontSize: 13, fontWeight: 850, color: "#d8d0c4" },
  codeInput: {
    width: "100%",
    border: "1px solid rgba(255, 253, 248, 0.18)",
    borderRadius: 8,
    padding: 13,
    background: "#fffdf8",
    color: "#1c1a17",
    fontWeight: 850,
    letterSpacing: 0,
    outlineColor: "#9f1d2f",
  },
  discountGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  discountGridStack: {
    gridTemplateColumns: "1fr",
  },
  preview: {
    borderRadius: 8,
    background: "rgba(255, 253, 248, 0.08)",
    border: "1px solid rgba(255, 253, 248, 0.12)",
    padding: 14,
    display: "grid",
    gap: 4,
    marginBottom: 14,
  },
  message: {
    borderRadius: 8,
    background: "rgba(255, 253, 248, 0.1)",
    padding: 10,
    color: "#fffdf8",
    fontWeight: 800,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  couponList: {
    display: "grid",
    gap: 10,
  },
  couponRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 14,
    background: "#fff",
  },
  couponRowStack: {
    gridTemplateColumns: "1fr",
  },
  couponMain: {
    minWidth: 0,
    display: "grid",
    gap: 5,
  },
  couponTopLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  couponCode: {
    fontSize: 18,
    letterSpacing: 0,
  },
  couponDescription: {
    color: "#625b53",
    lineHeight: 1.4,
  },
  discountValue: {
    color: "#9f1d2f",
    fontSize: 13,
  },
  statusActive: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  statusPaused: {
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  statusActiveSoft: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  statusPausedSoft: {
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  actionButton: {
    border: "none",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  pauseButton: { background: "#f0ebe2", color: "#514a43" },
  activateButton: { background: "#1c1a17", color: "#fffdf8" },
};
