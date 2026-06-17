"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
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

    const { error } = await supabase.from("promotions").insert([payload]);
    if (error) {
      setMessage("Crie a tabela promotions no Supabase para salvar promocoes.");
      return;
    }

    setForm(emptyPromotion);
    setMessage("Promocao criada.");
    fetchPromotions();
  }

  async function togglePromotion(promotion: Promotion) {
    if (!promotion.id) return;
    await supabase.from("promotions").update({ active: !promotion.active }).eq("id", promotion.id);
    fetchPromotions();
  }

  return (
    <AdminShell eyebrow="Marketing" title="Promocoes">
      <section style={styles.grid}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Cupom</p>
              <h2 style={styles.cardTitle}>Nova promocao</h2>
            </div>
          </div>

          <div style={localStyles.formStack}>
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="CODIGO"
              style={styles.input}
            />
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Descricao"
              style={styles.input}
            />
            <select
              value={form.discount_type}
              onChange={(event) =>
                setForm({ ...form, discount_type: event.target.value as Promotion["discount_type"] })
              }
              style={styles.select}
            >
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
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
            <label style={localStyles.toggleLine}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Ativa
            </label>
          </div>

          {message && <p style={styles.mutedSmall}>{message}</p>}
          <button type="submit" style={styles.primaryLink}>
            Criar promocao
          </button>
        </form>

        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Cupons</p>
              <h2 style={styles.cardTitle}>Ativos e pausados</h2>
            </div>
          </div>

          {promotions.map((promotion) => (
            <div key={promotion.id || promotion.code} style={styles.row}>
              <div>
                <strong>{promotion.code}</strong>
                <p style={styles.mutedSmall}>
                  {promotion.description || "Sem descricao"} -{" "}
                  {promotion.discount_type === "percent"
                    ? `${promotion.discount_value}%`
                    : `R$ ${promotion.discount_value}`}
                </p>
              </div>
              <button type="button" onClick={() => togglePromotion(promotion)} style={styles.secondaryButton}>
                {promotion.active ? "Pausar" : "Ativar"}
              </button>
            </div>
          ))}

          {promotions.length === 0 && <EmptyState text="Nenhuma promocao cadastrada." />}
        </article>
      </section>
    </AdminShell>
  );
}

const localStyles: Record<string, CSSProperties> = {
  formStack: { display: "grid", gap: 10, marginBottom: 14 },
  toggleLine: { display: "flex", alignItems: "center", gap: 8, fontWeight: 850 },
};
