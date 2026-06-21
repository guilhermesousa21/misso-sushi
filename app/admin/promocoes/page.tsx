"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useIsMobile, useIsTablet } from "../../../lib/useMediaQuery";
import { AdminShell, EmptyState, adminStyles as styles } from "../AdminShell";

type Promotion = {
  id?: number;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_value?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  active: boolean;
};

const emptyPromotion: Promotion = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_value: 0,
  usage_limit: null,
  used_count: 0,
  starts_at: "",
  expires_at: "",
  active: true,
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatBrazilianDateInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatBrazilianTimeInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const isValidBrazilianTime = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const getDateTimeParts = (value?: string | null) => {
  if (!value) return { date: "", time: "" };

  const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (localMatch) {
    return {
      date: `${localMatch[3]}/${localMatch[2]}/${localMatch[1]}`,
      time: localMatch[4],
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  return {
    date: `${parts.find((part) => part.type === "day")?.value || ""}/${
      parts.find((part) => part.type === "month")?.value || ""
    }/${parts.find((part) => part.type === "year")?.value || ""}`,
    time: `${parts.find((part) => part.type === "hour")?.value || "00"}:${
      parts.find((part) => part.type === "minute")?.value || "00"
    }`,
  };
};

const toDateTimeValue = (dateValue: string, timeValue: string) => {
  const digits = onlyDigits(dateValue);
  if (digits.length !== 8 || !isValidBrazilianTime(timeValue)) return "";

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}T${timeValue}`;
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<Promotion>(emptyPromotion);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [message, setMessage] = useState("");
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setPromotions(
        (data as Promotion[]).filter(
          (promotion) =>
            !promotion.code.startsWith("EXCLUIDO-") &&
            promotion.description !== "[excluido]"
        )
      );
    }
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
      min_order_value: Number(form.min_order_value || 0),
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      active: form.active,
    };

    if (!payload.code || payload.discount_value <= 0) {
      setMessage("Informe o código e um desconto maior que zero.");
      return;
    }

    const { error } = await supabase.from("promotions").insert([payload]);
    if (error) {
      setMessage("Crie a tabela promotions no Supabase para salvar promoções.");
      return;
    }

    setForm(emptyPromotion);
    setMessage("Promoção criada com sucesso.");
    fetchPromotions();
  }

  async function togglePromotion(promotion: Promotion) {
    if (!promotion.id) return;
    await supabase.from("promotions").update({ active: !promotion.active }).eq("id", promotion.id);
    fetchPromotions();
  }

  async function handleUpdatePromotion(updatedPromotion: Promotion) {
    if (!updatedPromotion.id) return;

    const payload = {
      code: updatedPromotion.code.trim().toUpperCase(),
      description: updatedPromotion.description.trim(),
      discount_type: updatedPromotion.discount_type,
      discount_value: Number(updatedPromotion.discount_value || 0),
      min_order_value: Number(updatedPromotion.min_order_value || 0),
      usage_limit: updatedPromotion.usage_limit ? Number(updatedPromotion.usage_limit) : null,
      starts_at: updatedPromotion.starts_at || null,
      expires_at: updatedPromotion.expires_at || null,
      active: updatedPromotion.active,
    };

    if (!payload.code || payload.discount_value <= 0) {
      setMessage("Informe o código e um desconto maior que zero.");
      return;
    }

    const { error } = await supabase
      .from("promotions")
      .update(payload)
      .eq("id", updatedPromotion.id);

    if (error) {
      setMessage("Não foi possível editar este cupom.");
      return;
    }

    setEditingPromotion(null);
    setMessage("Cupom atualizado com sucesso.");
    fetchPromotions();
  }

  async function handleDeletePromotion(promotion: Promotion) {
    if (!promotion.id) return;

    const { data, error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", promotion.id)
      .select("id");

    if (error || !data?.length) {
      const archiveCode = `EXCLUIDO-${promotion.id}-${Date.now()}`;
      const { error: archiveError } = await supabase
        .from("promotions")
        .update({
          code: archiveCode,
          description: "[excluido]",
          active: false,
        })
        .eq("id", promotion.id);

      if (archiveError) {
        setMessage(`Não foi possível excluir este cupom: ${archiveError.message}`);
        return;
      }
    }

    setEditingPromotion(null);
    setMessage("Cupom excluído com sucesso.");
    fetchPromotions();
  }

  return (
    <AdminShell eyebrow="Marketing" title="Promoções">
      <section style={{ ...localStyles.metrics, ...(isMobile ? localStyles.metricsMobile : {}) }}>
        <Metric label="Cupons" value={String(promotions.length)} />
        <Metric label="Ativos" value={String(activePromotions)} />
        <Metric label="Pausados" value={String(pausedPromotions)} />
      </section>

      <section style={{ ...localStyles.layout, ...(isTablet ? localStyles.layoutStack : {}) }}>
        <form onSubmit={handleSubmit} style={{ ...localStyles.createPanel, ...(isMobile ? localStyles.panelMobile : {}) }}>
          <div style={{ ...localStyles.panelHeader, ...(isMobile ? localStyles.panelHeaderMobile : {}) }}>
            <div>
              <p style={styles.cardEyebrow}>Novo cupom</p>
              <h2 style={localStyles.panelTitle}>Criar promoção</h2>
            </div>
            <span style={form.active ? localStyles.statusActive : localStyles.statusPaused}>
              {form.active ? "Ativo" : "Pausado"}
            </span>
          </div>

          <div style={localStyles.formStack}>
            <label style={localStyles.field}>
              <span style={localStyles.label}>Código do cupom</span>
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
              <span style={localStyles.label}>Descrição</span>
              <input
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Ex: desconto de inauguração"
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

            <div style={{ ...localStyles.discountGrid, ...(isMobile ? localStyles.discountGridStack : {}) }}>
              <label style={localStyles.field}>
                <span style={localStyles.label}>Pedido mínimo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_order_value || 0}
                  onChange={(event) =>
                    setForm({ ...form, min_order_value: Number(event.target.value) })
                  }
                  style={styles.input}
                />
              </label>
              <label style={localStyles.field}>
                <span style={localStyles.label}>Limite de usos</span>
                <input
                  type="number"
                  min="0"
                  value={form.usage_limit ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      usage_limit: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="Ilimitado"
                  style={styles.input}
                />
              </label>
            </div>

            <div style={localStyles.dateGrid}>
              <PromotionDateTimeField
                label="Início"
                value={form.starts_at}
                labelStyle={localStyles.label}
                onChange={(value) => setForm({ ...form, starts_at: value })}
              />
              <PromotionDateTimeField
                label="Expira em"
                value={form.expires_at}
                labelStyle={localStyles.label}
                onChange={(value) => setForm({ ...form, expires_at: value })}
              />
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

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ ...styles.primaryLink, ...(!canSubmit ? localStyles.disabledButton : {}) }}
          >
            Criar promoção
          </button>
        </form>

        <article style={{ ...localStyles.listPanel, ...(isMobile ? localStyles.panelMobile : {}) }}>
          <div style={{ ...localStyles.panelHeader, ...(isMobile ? localStyles.panelHeaderMobile : {}) }}>
            <div>
              <p style={styles.cardEyebrow}>Cupons</p>
              <h2 style={localStyles.panelTitle}>Gerenciar cupons</h2>
            </div>
          </div>

          {message && <p style={localStyles.listMessage}>{message}</p>}

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
                      {promotion.description || "Sem descrição"}
                    </p>
                    <strong style={localStyles.discountValue}>{discount} de desconto</strong>
                    <p style={localStyles.couponDescription}>
                      Mínimo: {Number(promotion.min_order_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {" | "}
                      Usos: {Number(promotion.used_count || 0)}
                      {promotion.usage_limit ? `/${promotion.usage_limit}` : " / ilimitado"}
                    </p>
                  </div>
                  <div style={{ ...localStyles.couponActions, ...(isMobile ? localStyles.couponActionsMobile : {}) }}>
                    <button
                      type="button"
                      onClick={() => setEditingPromotion(promotion)}
                      style={localStyles.editButton}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePromotion(promotion)}
                      aria-pressed={promotion.active}
                      aria-label={promotion.active ? "Pausar cupom" : "Ativar cupom"}
                      style={{
                        ...localStyles.couponSwitch,
                        ...(promotion.active ? localStyles.couponSwitchActive : localStyles.couponSwitchPaused),
                      }}
                    >
                      <span
                        style={{
                          ...localStyles.couponSwitchThumb,
                          ...(promotion.active ? localStyles.couponSwitchThumbActive : {}),
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {promotions.length === 0 && <EmptyState text="Nenhuma promoção cadastrada." />}
        </article>
      </section>

      {editingPromotion && (
        <PromotionEditModal
          promotion={editingPromotion}
          onClose={() => setEditingPromotion(null)}
          onSave={handleUpdatePromotion}
          onDelete={handleDeletePromotion}
        />
      )}
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

function PromotionDateTimeField({
  label,
  value,
  labelStyle,
  onChange,
}: {
  label: string;
  value?: string | null;
  labelStyle: CSSProperties;
  onChange: (value: string) => void;
}) {
  const parts = getDateTimeParts(value);
  const [dateValue, setDateValue] = useState(parts.date);
  const [timeValue, setTimeValue] = useState(parts.time);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextParts = getDateTimeParts(value);
      setDateValue(nextParts.date);
      setTimeValue(nextParts.time);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  const updateDateTime = (nextDate: string, nextTime: string) => {
    if (!nextDate && !nextTime) {
      onChange("");
      return;
    }

    const nextValue = toDateTimeValue(nextDate, nextTime);
    if (nextValue) onChange(nextValue);
  };

  return (
    <label style={localStyles.field}>
      <span style={labelStyle}>{label}</span>
      <div style={localStyles.brazilianDateGrid}>
        <input
          inputMode="numeric"
          value={dateValue}
          onChange={(event) => {
            const nextDate = formatBrazilianDateInput(event.target.value);
            setDateValue(nextDate);
            updateDateTime(nextDate, timeValue);
          }}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          style={styles.input}
        />
        <input
          type="text"
          inputMode="numeric"
          value={timeValue}
          onChange={(event) => {
            const nextTime = formatBrazilianTimeInput(event.target.value);
            setTimeValue(nextTime);
            updateDateTime(dateValue, nextTime);
          }}
          placeholder="00:00"
          maxLength={5}
          aria-label={`${label} - hora`}
          style={styles.input}
        />
      </div>
    </label>
  );
}

function PromotionEditModal({
  promotion,
  onClose,
  onSave,
  onDelete,
}: {
  promotion: Promotion;
  onClose: () => void;
  onSave: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
}) {
  const [form, setForm] = useState<Promotion>(promotion);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canSave = form.code.trim().length > 0 && Number(form.discount_value || 0) > 0;

  return (
    <div style={localStyles.modalOverlay}>
      <div style={localStyles.modal}>
        <div style={localStyles.modalHeader}>
          <div>
            <p style={styles.cardEyebrow}>Cupom</p>
            <h2 style={localStyles.panelTitle}>Editar cupom</h2>
          </div>
          <button type="button" onClick={onClose} style={localStyles.closeButton}>
            Fechar
          </button>
        </div>

        <div style={localStyles.formStack}>
          <label style={localStyles.field}>
            <span style={localStyles.modalLabel}>Código do cupom</span>
            <input
              value={form.code}
              onChange={(event) =>
                setForm({
                  ...form,
                  code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                })
              }
              onFocus={() => setConfirmDelete(false)}
              style={styles.input}
            />
          </label>

          <label style={localStyles.field}>
            <span style={localStyles.modalLabel}>Descrição</span>
            <input
              value={form.description}
              onChange={(event) => {
                setConfirmDelete(false);
                setForm({ ...form, description: event.target.value });
              }}
              style={styles.input}
            />
          </label>

          <div style={localStyles.discountGrid}>
            <label style={localStyles.field}>
              <span style={localStyles.modalLabel}>Tipo</span>
              <select
                value={form.discount_type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    discount_type: event.target.value as Promotion["discount_type"],
                  })
                }
                onFocus={() => setConfirmDelete(false)}
                style={styles.select}
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>

            <label style={localStyles.field}>
              <span style={localStyles.modalLabel}>Desconto</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({ ...form, discount_value: Number(event.target.value) });
                }}
                style={styles.input}
              />
            </label>
          </div>
          <div style={localStyles.discountGrid}>
            <label style={localStyles.field}>
              <span style={localStyles.modalLabel}>Pedido mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_value || 0}
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({ ...form, min_order_value: Number(event.target.value) });
                }}
                style={styles.input}
              />
            </label>

            <label style={localStyles.field}>
              <span style={localStyles.modalLabel}>Limite de usos</span>
              <input
                type="number"
                min="0"
                value={form.usage_limit ?? ""}
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({
                    ...form,
                    usage_limit: event.target.value ? Number(event.target.value) : null,
                  });
                }}
                placeholder="Ilimitado"
                style={styles.input}
              />
            </label>
          </div>
          <div style={localStyles.dateGrid}>
            <PromotionDateTimeField
              label="Início"
              value={form.starts_at}
              labelStyle={localStyles.modalLabel}
              onChange={(value) => {
                setConfirmDelete(false);
                setForm({ ...form, starts_at: value });
              }}
            />

            <PromotionDateTimeField
              label="Expira em"
              value={form.expires_at}
              labelStyle={localStyles.modalLabel}
              onChange={(value) => {
                setConfirmDelete(false);
                setForm({ ...form, expires_at: value });
              }}
            />
          </div>
        </div>

        <div style={localStyles.modalActions}>
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              onDelete(promotion);
            }}
            style={{
              ...localStyles.deleteButton,
              ...(confirmDelete ? localStyles.deleteButtonConfirm : {}),
            }}
          >
            {confirmDelete ? "Confirmar exclusão" : "Excluir cupom"}
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!canSave}
            style={{ ...styles.primaryLink, ...(!canSave ? localStyles.disabledButton : {}) }}
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

const localStyles: Record<string, CSSProperties> = {
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricsMobile: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
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
    gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)",
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
    minWidth: 0,
    overflow: "hidden",
  },
  panelMobile: {
    padding: 14,
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
  panelHeaderMobile: {
    display: "grid",
    gap: 8,
  },
  panelTitle: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  formStack: { display: "grid", gap: 12, marginBottom: 14, minWidth: 0 },
  field: { display: "grid", gap: 7, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 850, color: "#d8d0c4" },
  codeInput: {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    minWidth: 0,
  },
  discountGridStack: {
    gridTemplateColumns: "1fr",
  },
  dateGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    minWidth: 0,
  },
  brazilianDateGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 112px",
    gap: 8,
    minWidth: 0,
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
  listMessage: {
    borderRadius: 8,
    background: "#dcfce7",
    color: "#166534",
    padding: 12,
    marginBottom: 12,
    fontWeight: 850,
    lineHeight: 1.4,
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
  couponSwitch: {
    width: 40,
    height: 24,
    border: "none",
    borderRadius: 999,
    padding: 3,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    boxShadow: "inset 0 1px 2px rgba(28, 26, 23, 0.16)",
    transition: "background 160ms ease",
  },
  couponSwitchActive: {
    background: "#34c759",
  },
  couponSwitchPaused: {
    background: "#d1d5db",
  },
  couponSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "#fff",
    boxShadow: "0 2px 5px rgba(28, 26, 23, 0.22)",
    transform: "translateX(0)",
    transition: "transform 160ms ease",
  },
  couponSwitchThumbActive: {
    transform: "translateX(16px)",
  },
  couponActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: 10,
  },
  couponActionsMobile: {
    justifyContent: "space-between",
  },
  editButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 120,
    background: "rgba(28, 26, 23, 0.46)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  modal: {
    width: "min(560px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#fffdf8",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.22)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 14,
    marginBottom: 16,
  },
  modalLabel: {
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
  },
  closeButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
  },
  deleteButton: {
    border: "1px solid rgba(153, 27, 27, 0.16)",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
  },
  deleteButtonConfirm: {
    background: "#991b1b",
    color: "#fff",
  },
};
