"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  getBusinessHours,
  getTodayBusinessHoursLabel,
  isWithinBusinessHours,
  type BusinessHours,
  weeklyBusinessHours,
} from "../../../lib/storeHours";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { AdminShell, adminStyles as baseStyles } from "../AdminShell";

type StoreSettings = {
  id?: number;
  is_open: boolean;
  average_time: string;
  service_fee: number;
  service_fee_label: string;
  pickup_slot_minutes: number;
  min_pickup_minutes: number;
  max_advance_days: number;
  order_slot_limit: number;
  business_hours: BusinessHours;
};

const defaultSettings: StoreSettings = {
  is_open: true,
  average_time: "35 a 50 min",
  service_fee: 0,
  service_fee_label: "Taxa de embalagem",
  pickup_slot_minutes: 30,
  min_pickup_minutes: 35,
  max_advance_days: 1,
  order_slot_limit: 0,
  business_hours: weeklyBusinessHours,
};

const orderedWeekDays = [1, 2, 3, 4, 5, 6, 0];

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatTime24Input = (value: string) => {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const isValidTime24 = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const isMissingColumnError = (error?: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" ||
  error?.code === "42703" ||
  Boolean(error?.message?.includes("schema cache"));

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const isMobile = useMediaQuery("(max-width: 760px)");

  const withinBusinessHours = isWithinBusinessHours(now, settings.business_hours);
  const storeOpenNow = settings.is_open;
  const openedOutsideHours = settings.is_open && !withinBusinessHours;
  const statusTitle = savingStatus
    ? "Atualizando status..."
    : storeOpenNow
    ? "Loja aberta"
    : "Loja fechada";
  const statusText = storeOpenNow
    ? openedOutsideHours
      ? `Pedidos liberados fora do horário cadastrado. ${getTodayBusinessHoursLabel(
          now,
          settings.business_hours
        )}.`
      : `Clientes podem enviar pedidos agora. ${getTodayBusinessHoursLabel(
          now,
          settings.business_hours
        )}.`
    : "Pedidos ficam bloqueados até você reabrir manualmente.";

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings({
          ...defaultSettings,
          ...(data as StoreSettings),
          business_hours: getBusinessHours((data as StoreSettings).business_hours),
        });
      }
    }

    fetchSettings();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const invalidDay = orderedWeekDays.find((day) => {
      const hours = settings.business_hours[day];
      return !isValidTime24(hours.open) || !isValidTime24(hours.close);
    });

    if (invalidDay !== undefined) {
      setSaving(false);
      setMessage("Revise os horários. Use o formato 00:00 até 23:59.");
      return;
    }

    const payload = {
      is_open: settings.is_open,
      average_time: settings.average_time,
      service_fee: Number(settings.service_fee || 0),
      service_fee_label: settings.service_fee_label || "Taxa de embalagem",
      pickup_slot_minutes: Number(settings.pickup_slot_minutes || 30),
      min_pickup_minutes: Number(settings.min_pickup_minutes || 35),
      max_advance_days: Number(settings.max_advance_days || 1),
      order_slot_limit: Number(settings.order_slot_limit || 0),
      business_hours: settings.business_hours,
    };
    const legacyPayload = {
      is_open: settings.is_open,
      average_time: settings.average_time,
      business_hours: settings.business_hours,
    };

    const query = settings.id
      ? supabase.from("store_settings").update(payload).eq("id", settings.id).select()
      : supabase.from("store_settings").insert([payload]).select();

    let { data, error } = await query;

    if (isMissingColumnError(error)) {
      const fallbackQuery = settings.id
        ? supabase.from("store_settings").update(legacyPayload).eq("id", settings.id).select()
        : supabase.from("store_settings").insert([legacyPayload]).select();
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

    setSaving(false);

    if (error) {
      setMessage("Crie a tabela store_settings no Supabase para salvar estas configurações.");
      return;
    }

    if (data?.[0]) {
      setSettings({
        ...defaultSettings,
        ...(data[0] as StoreSettings),
        business_hours: getBusinessHours((data[0] as StoreSettings).business_hours),
      });
    }
    setMessage("Configurações salvas.");
  }

  async function updateStoreStatus(isOpen: boolean) {
    if (savingStatus || settings.is_open === isOpen) return;

    const previousSettings = settings;
    const nextSettings = { ...settings, is_open: isOpen };
    setSettings(nextSettings);
    setSavingStatus(true);
    setMessage("");

    const payload = {
      is_open: isOpen,
      average_time: settings.average_time,
      service_fee: Number(settings.service_fee || 0),
      service_fee_label: settings.service_fee_label || "Taxa de embalagem",
      pickup_slot_minutes: Number(settings.pickup_slot_minutes || 30),
      min_pickup_minutes: Number(settings.min_pickup_minutes || 35),
      max_advance_days: Number(settings.max_advance_days || 1),
      order_slot_limit: Number(settings.order_slot_limit || 0),
      business_hours: settings.business_hours,
    };
    const legacyPayload = {
      is_open: isOpen,
      average_time: settings.average_time,
      business_hours: settings.business_hours,
    };

    const query = settings.id
      ? supabase.from("store_settings").update(payload).eq("id", settings.id).select()
      : supabase.from("store_settings").insert([payload]).select();

    let { data, error } = await query;

    if (isMissingColumnError(error)) {
      const fallbackQuery = settings.id
        ? supabase.from("store_settings").update(legacyPayload).eq("id", settings.id).select()
        : supabase.from("store_settings").insert([legacyPayload]).select();
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

    setSavingStatus(false);

    if (error) {
      setSettings(previousSettings);
      setMessage("Não foi possível atualizar o status da loja.");
      return;
    }

    if (data?.[0]) {
      setSettings({
        ...defaultSettings,
        ...(data[0] as StoreSettings),
        business_hours: getBusinessHours((data[0] as StoreSettings).business_hours),
      });
    }
    setMessage(isOpen ? "Loja aberta." : "Loja fechada.");
  }

  return (
    <AdminShell eyebrow="Operação" title="Configurações">
      <style>
        {`
          @keyframes red-status-pulse {
            0% { box-shadow: 0 0 0 0 rgba(153, 27, 27, 0.42); transform: scale(1); }
            70% { box-shadow: 0 0 0 9px rgba(153, 27, 27, 0); transform: scale(1.12); }
            100% { box-shadow: 0 0 0 0 rgba(153, 27, 27, 0); transform: scale(1); }
          }

          @keyframes green-status-pulse {
            0% { box-shadow: 0 0 0 0 rgba(15, 122, 74, 0.42); transform: scale(1); }
            70% { box-shadow: 0 0 0 9px rgba(15, 122, 74, 0); transform: scale(1.12); }
            100% { box-shadow: 0 0 0 0 rgba(15, 122, 74, 0); transform: scale(1); }
          }
        `}
      </style>

      <form onSubmit={handleSubmit} style={styles.settingsForm}>
        <section
          style={{
            ...styles.statusPanel,
            ...(storeOpenNow ? styles.statusPanelOpen : styles.statusPanelClosed),
            ...(isMobile ? styles.statusPanelMobile : {}),
          }}
        >
          <div style={styles.statusContent}>
            <div style={styles.statusMeta}>
              <span
                style={{
                  ...styles.statusDot,
                  ...(storeOpenNow ? styles.statusDotOpen : styles.statusDotClosed),
                }}
              />
              <span style={styles.statusEyebrow}>Status atual</span>
            </div>

            <strong style={{ ...styles.statusTitle, ...(isMobile ? styles.statusTitleMobile : {}) }}>
              {statusTitle}
            </strong>
            <p style={styles.statusText}>{statusText}</p>
          </div>

          <div style={{ ...styles.statusActions, ...(isMobile ? styles.statusActionsMobile : {}) }}>
            <span style={styles.statusActionsLabel}>Controle manual</span>
            <div
              style={{ ...styles.statusSwitch, ...(isMobile ? styles.statusSwitchMobile : {}) }}
              role="group"
              aria-label="Status da loja"
            >
              <button
                type="button"
                onClick={() => updateStoreStatus(true)}
                disabled={savingStatus}
                style={{
                  ...styles.statusOption,
                  ...(settings.is_open ? styles.statusOptionOpenActive : {}),
                  ...(savingStatus ? styles.statusOptionDisabled : {}),
                }}
              >
                Aberta
              </button>
              <button
                type="button"
                onClick={() => updateStoreStatus(false)}
                disabled={savingStatus}
                style={{
                  ...styles.statusOption,
                  ...(!settings.is_open ? styles.statusOptionClosedActive : {}),
                  ...(savingStatus ? styles.statusOptionDisabled : {}),
                }}
              >
                Fechada
              </button>
            </div>
          </div>
        </section>

        <section style={{ ...baseStyles.card, ...(isMobile ? styles.cardMobile : {}) }}>
          <div style={{ ...baseStyles.cardHeader, ...(isMobile ? styles.cardHeaderMobile : {}) }}>
            <div>
              <p style={baseStyles.cardEyebrow}>Atendimento</p>
              <h2 style={baseStyles.cardTitle}>Tempo médio de preparo</h2>
            </div>
          </div>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              <input
                value={settings.average_time}
                onChange={(event) =>
                  setSettings({ ...settings, average_time: event.target.value })
                }
                style={baseStyles.input}
                placeholder="Ex: 35 a 50 min"
              />
            </label>
          </div>

          <div style={styles.scheduleHeader}>
            <div>
              <span style={styles.label}>Horários de atendimento</span>
              <p style={styles.scheduleSubtitle}>
                Defina quando o cardápio aceita novos pedidos.
              </p>
            </div>
            <span style={styles.todayPill}>
              {getTodayBusinessHoursLabel(now, settings.business_hours)}
            </span>
          </div>

          <div style={styles.scheduleGrid}>
            {orderedWeekDays.map((day) => {
              const hours = settings.business_hours[day];

              return (
                <div
                  key={day}
                  style={{ ...styles.scheduleRow, ...(isMobile ? styles.scheduleRowMobile : {}) }}
                >
                  <strong style={{ ...styles.dayLabel, ...(isMobile ? styles.dayLabelMobile : {}) }}>
                    {hours.label}
                  </strong>
                  <label style={styles.timeField}>
                    <span style={styles.timeLabel}>Abre</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={hours.open}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          business_hours: {
                            ...settings.business_hours,
                            [day]: { ...hours, open: formatTime24Input(event.target.value) },
                          },
                        })
                      }
                      maxLength={5}
                      placeholder="00:00"
                      style={{ ...baseStyles.input, ...styles.timeInput }}
                    />
                  </label>
                  <label style={styles.timeField}>
                    <span style={styles.timeLabel}>Fecha</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={hours.close}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          business_hours: {
                            ...settings.business_hours,
                            [day]: { ...hours, close: formatTime24Input(event.target.value) },
                          },
                        })
                      }
                      maxLength={5}
                      placeholder="23:59"
                      style={{ ...baseStyles.input, ...styles.timeInput }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <p style={styles.hint}>
            Fora desses horários o cliente não consegue enviar pedido. Use 00:00 como
            fechamento da meia-noite.
          </p>
        </section>

        <div style={{ ...styles.saveBar, ...(isMobile ? styles.saveBarMobile : {}) }}>
          {message ? (
            <p style={styles.message}>{message}</p>
          ) : (
            <span style={styles.saveHint}>Revise os horários antes de salvar.</span>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{ ...baseStyles.primaryLink, ...(isMobile ? styles.fullWidthButton : {}) }}
          >
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}

const styles: Record<string, CSSProperties> = {
  settingsForm: {
    display: "grid",
    gap: 16,
  },
  cardMobile: {
    padding: 14,
  },
  cardHeaderMobile: {
    display: "grid",
    gap: 8,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
  field: {
    display: "grid",
    gap: 7,
  },
  label: {
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
  },
  statusPanel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 8,
    padding: 22,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 300px)",
    gap: 18,
    alignItems: "center",
    background: "#fffdf8",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  statusPanelMobile: {
    gridTemplateColumns: "1fr",
    padding: 12,
    gap: 12,
  },
  statusPanelOpen: {
    borderColor: "rgba(15, 122, 74, 0.22)",
    background: "linear-gradient(135deg, #fffdf8 0%, #f2fbf6 100%)",
  },
  statusPanelClosed: {
    borderColor: "rgba(153, 27, 27, 0.18)",
    background: "linear-gradient(135deg, #fffdf8 0%, #fff4f4 100%)",
  },
  statusContent: {
    display: "grid",
    gap: 8,
    minWidth: 0,
  },
  statusMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
    flex: "0 0 auto",
  },
  statusDotOpen: {
    background: "#0f7a4a",
    animation: "green-status-pulse 1.35s ease-out infinite",
  },
  statusDotClosed: {
    background: "#991b1b",
    animation: "red-status-pulse 1.35s ease-out infinite",
  },
  statusEyebrow: {
    display: "block",
    color: "#625b53",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  statusTitle: {
    display: "block",
    fontSize: 34,
    lineHeight: 1.05,
  },
  statusTitleMobile: {
    fontSize: 28,
  },
  statusText: {
    color: "#514a43",
    lineHeight: 1.45,
    maxWidth: 680,
  },
  statusActions: {
    display: "grid",
    gap: 8,
  },
  statusActionsMobile: {
    width: "100%",
  },
  statusActionsLabel: {
    color: "#625b53",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  statusSwitch: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 999,
    background: "#f7f4ef",
    padding: 5,
    minWidth: 226,
  },
  statusSwitchMobile: {
    minWidth: 0,
    width: "100%",
  },
  statusOption: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#514a43",
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 850,
  },
  statusOptionOpenActive: {
    background: "#0f7a4a",
    color: "#fff",
    boxShadow: "0 8px 18px rgba(15, 122, 74, 0.18)",
  },
  statusOptionClosedActive: {
    background: "#991b1b",
    color: "#fff",
    boxShadow: "0 8px 18px rgba(153, 27, 27, 0.16)",
  },
  statusOptionDisabled: {
    opacity: 0.62,
    cursor: "not-allowed",
  },
  scheduleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  scheduleSubtitle: {
    marginTop: 4,
    color: "#766e64",
    fontSize: 13,
  },
  todayPill: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "7px 10px",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  scheduleGrid: {
    display: "grid",
    gap: 8,
  },
  scheduleRow: {
    display: "grid",
    gridTemplateColumns: "minmax(130px, 1fr) minmax(110px, 150px) minmax(110px, 150px)",
    gap: 10,
    alignItems: "center",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
  },
  scheduleRowMobile: {
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  dayLabel: {
    color: "#1c1a17",
    textTransform: "capitalize",
  },
  dayLabelMobile: {
    gridColumn: "1 / -1",
  },
  timeField: {
    display: "grid",
    gap: 5,
  },
  timeLabel: {
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  timeInput: {
    padding: "9px 10px",
  },
  hint: {
    marginTop: 10,
    color: "#625b53",
    lineHeight: 1.45,
  },
  saveBar: {
    position: "sticky",
    bottom: 12,
    zIndex: 5,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    background: "rgba(255, 253, 248, 0.94)",
    padding: 12,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.12)",
    backdropFilter: "blur(12px)",
  },
  saveBarMobile: {
    display: "grid",
    bottom: 82,
    gap: 8,
  },
  message: {
    color: "#625b53",
    fontWeight: 800,
  },
  saveHint: {
    color: "#766e64",
    fontSize: 13,
    fontWeight: 750,
  },
  fullWidthButton: {
    width: "100%",
  },
  addonList: {
    display: "grid",
    gap: 12,
  },
  addonRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(120px, 0.7fr) auto auto",
    gap: 10,
    alignItems: "end",
  },
  addonActiveField: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
    paddingBottom: 12,
    whiteSpace: "nowrap",
  },
};



