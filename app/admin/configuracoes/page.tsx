"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  getBusinessHours,
  getNextOpeningLabel,
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
  business_hours: BusinessHours;
};

const defaultSettings: StoreSettings = {
  is_open: true,
  average_time: "35 a 50 min",
  business_hours: weeklyBusinessHours,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const isMobile = useMediaQuery("(max-width: 760px)");

  const withinBusinessHours = isWithinBusinessHours(now, settings.business_hours);
  const storeOpenNow = settings.is_open && withinBusinessHours;

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

    const payload = {
      is_open: settings.is_open,
      average_time: settings.average_time,
      business_hours: settings.business_hours,
    };

    const query = settings.id
      ? supabase.from("store_settings").update(payload).eq("id", settings.id).select()
      : supabase.from("store_settings").insert([payload]).select();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      setMessage("Crie a tabela store_settings no Supabase para salvar estas configurações.");
      return;
    }

    if (data?.[0]) setSettings({ ...(data[0] as StoreSettings) });
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
      business_hours: settings.business_hours,
    };

    const query = settings.id
      ? supabase.from("store_settings").update(payload).eq("id", settings.id).select()
      : supabase.from("store_settings").insert([payload]).select();

    const { data, error } = await query;
    setSavingStatus(false);

    if (error) {
      setSettings(previousSettings);
      setMessage("Não foi possível atualizar o status da loja.");
      return;
    }

    if (data?.[0]) {
      setSettings({
        ...(data[0] as StoreSettings),
        business_hours: getBusinessHours((data[0] as StoreSettings).business_hours),
      });
    }
    setMessage(isOpen ? "Loja aberta." : "Loja fechada.");
  }

  return (
    <AdminShell eyebrow="Operação" title="Configurações">
      <form onSubmit={handleSubmit} style={{ ...baseStyles.card, ...(isMobile ? styles.cardMobile : {}) }}>
        <div style={{ ...baseStyles.cardHeader, ...(isMobile ? styles.cardHeaderMobile : {}) }}>
          <div>
            <p style={baseStyles.cardEyebrow}>Loja</p>
            <h2 style={baseStyles.cardTitle}>Status e atendimento</h2>
          </div>
        </div>

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
              <span
                style={{
                  ...styles.statusBadge,
                  ...(storeOpenNow ? styles.statusBadgeOpen : styles.statusBadgeClosed),
                }}
              >
                {storeOpenNow ? "Recebendo pedidos" : "Pedidos pausados"}
              </span>
            </div>
            <strong style={styles.statusTitle}>
              {savingStatus
                ? "Atualizando status..."
                : storeOpenNow
                ? "Loja aberta"
                : "Loja fechada"}
            </strong>
            <p style={styles.statusText}>
              {storeOpenNow
                ? `Clientes podem enviar pedidos agora. ${getTodayBusinessHoursLabel(now, settings.business_hours)}.`
                : !settings.is_open
                ? "Pedidos ficam bloqueados até você reabrir manualmente."
                : `Fechada pelo horário cadastrado. ${getNextOpeningLabel(now, settings.business_hours)}.`}
            </p>
          </div>
          <div style={{ ...styles.statusSwitch, ...(isMobile ? styles.statusSwitchMobile : {}) }} role="group" aria-label="Status da loja">
            <button
              type="button"
              onClick={() => updateStoreStatus(true)}
              disabled={savingStatus}
              style={{
                ...styles.statusOption,
                ...(storeOpenNow ? styles.statusOptionOpenActive : {}),
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
                ...(!storeOpenNow ? styles.statusOptionClosedActive : {}),
                ...(savingStatus ? styles.statusOptionDisabled : {}),
              }}
            >
              Fechada
            </button>
          </div>
        </section>

        <div style={styles.formGrid}>
          <label style={styles.field}>
            <span style={styles.label}>Tempo médio</span>
            <input
              value={settings.average_time}
              onChange={(event) => setSettings({ ...settings, average_time: event.target.value })}
              style={baseStyles.input}
            />
          </label>
        </div>

        <section style={styles.scheduleBox}>
          <span style={styles.label}>Horários de atendimento</span>
          <div style={styles.scheduleGrid}>
            {[2, 3, 4, 5, 6, 0, 1].map((day) => {
              const hours = settings.business_hours[day];

              return (
                <div key={day} style={{ ...styles.scheduleRow, ...(isMobile ? styles.scheduleRowMobile : {}) }}>
                  <strong style={styles.dayLabel}>{hours.label}</strong>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        business_hours: {
                          ...settings.business_hours,
                          [day]: { ...hours, open: event.target.value },
                        },
                      })
                    }
                    style={baseStyles.input}
                  />
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        business_hours: {
                          ...settings.business_hours,
                          [day]: { ...hours, close: event.target.value },
                        },
                      })
                    }
                    style={baseStyles.input}
                  />
                </div>
              );
            })}
          </div>
          <p style={styles.hint}>
            Fora desses horários o cliente não consegue enviar pedido. Use 00:00 como fechamento da meia-noite.
          </p>
        </section>

        {message && <p style={styles.message}>{message}</p>}

        <button type="submit" disabled={saving} style={{ ...baseStyles.primaryLink, ...(isMobile ? styles.fullWidthButton : {}) }}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </AdminShell>
  );
}

const styles: Record<string, CSSProperties> = {
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
    marginBottom: 16,
  },
  field: { display: "grid", gap: 7 },
  label: { color: "#514a43", fontSize: 13, fontWeight: 850 },
  statusPanel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 16,
    alignItems: "center",
    background: "#fffdf8",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  statusPanelMobile: {
    gridTemplateColumns: "1fr",
    padding: 14,
  },
  statusPanelOpen: {
    borderColor: "rgba(15, 122, 74, 0.18)",
  },
  statusPanelClosed: {
    borderColor: "rgba(153, 27, 27, 0.16)",
  },
  statusContent: {
    display: "grid",
    gap: 7,
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
  },
  statusDotOpen: {
    background: "#0f7a4a",
    boxShadow: "0 0 0 4px rgba(15, 122, 74, 0.12)",
  },
  statusDotClosed: {
    background: "#991b1b",
    boxShadow: "0 0 0 4px rgba(153, 27, 27, 0.1)",
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
    fontSize: 26,
    lineHeight: 1.1,
  },
  statusText: {
    color: "#514a43",
    lineHeight: 1.45,
  },
  statusBadge: {
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 12,
    fontWeight: 850,
  },
  statusBadgeOpen: {
    background: "#ecfdf5",
    color: "#0f7a4a",
  },
  statusBadgeClosed: {
    background: "#fff1f1",
    color: "#991b1b",
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
  message: { margin: "10px 0 16px", color: "#625b53", fontWeight: 800 },
  scheduleBox: {
    borderRadius: 8,
    background: "#f0ebe2",
    padding: 14,
    marginBottom: 16,
  },
  scheduleGrid: {
    display: "grid",
    gap: 10,
    marginTop: 10,
  },
  scheduleRow: {
    display: "grid",
    gridTemplateColumns: "minmax(130px, 1fr) minmax(110px, 150px) minmax(110px, 150px)",
    gap: 10,
    alignItems: "center",
  },
  scheduleRowMobile: {
    gridTemplateColumns: "1fr",
  },
  dayLabel: {
    color: "#1c1a17",
    textTransform: "capitalize",
  },
  hint: {
    marginTop: 8,
    color: "#625b53",
    lineHeight: 1.45,
  },
  fullWidthButton: {
    width: "100%",
  },
};
