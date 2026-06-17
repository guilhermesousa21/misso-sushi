"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  getBusinessHours,
  type BusinessHours,
  weeklyBusinessHours,
} from "../../../lib/storeHours";
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
      setMessage("Crie a tabela store_settings no Supabase para salvar estas configuracoes.");
      return;
    }

    if (data?.[0]) setSettings({ ...(data[0] as StoreSettings) });
    setMessage("Configuracoes salvas.");
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
      setMessage("Nao foi possivel atualizar o status da loja.");
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
    <AdminShell eyebrow="Operacao" title="Configuracoes">
      <form onSubmit={handleSubmit} style={baseStyles.card}>
        <div style={baseStyles.cardHeader}>
          <div>
            <p style={baseStyles.cardEyebrow}>Loja</p>
            <h2 style={baseStyles.cardTitle}>Status e atendimento</h2>
          </div>
        </div>

        <section
          style={{
            ...styles.statusPanel,
            ...(settings.is_open ? styles.statusPanelOpen : styles.statusPanelClosed),
          }}
        >
          <div>
            <span style={styles.statusEyebrow}>Status atual</span>
            <strong style={styles.statusTitle}>
              {savingStatus
                ? "Atualizando status..."
                : settings.is_open
                ? "Loja aberta"
                : "Loja fechada"}
            </strong>
            <p style={styles.statusText}>
              {settings.is_open
                ? "Clientes podem enviar pedidos dentro dos horarios cadastrados."
                : "Pedidos ficam bloqueados ate voce reabrir manualmente."}
            </p>
          </div>
          <div style={styles.statusSwitch} role="group" aria-label="Status da loja">
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
        </section>

        <div style={styles.formGrid}>
          <label style={styles.field}>
            <span style={styles.label}>Tempo medio</span>
            <input
              value={settings.average_time}
              onChange={(event) => setSettings({ ...settings, average_time: event.target.value })}
              style={baseStyles.input}
            />
          </label>
        </div>

        <section style={styles.scheduleBox}>
          <span style={styles.label}>Horarios de atendimento</span>
          <div style={styles.scheduleGrid}>
            {[2, 3, 4, 5, 6, 0, 1].map((day) => {
              const hours = settings.business_hours[day];

              return (
                <div key={day} style={styles.scheduleRow}>
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
            Fora desses horarios o cliente nao consegue enviar pedido. Use 00:00 como fechamento da meia-noite.
          </p>
        </section>

        {message && <p style={styles.message}>{message}</p>}

        <button type="submit" disabled={saving} style={baseStyles.primaryLink}>
          {saving ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </form>
    </AdminShell>
  );
}

const styles: Record<string, CSSProperties> = {
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  field: { display: "grid", gap: 7 },
  label: { color: "#514a43", fontSize: 13, fontWeight: 850 },
  statusPanel: {
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 16,
    alignItems: "center",
  },
  statusPanelOpen: {
    background: "#ecfdf5",
    borderColor: "rgba(15, 122, 74, 0.18)",
  },
  statusPanelClosed: {
    background: "#fee2e2",
    borderColor: "rgba(153, 27, 27, 0.18)",
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
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  statusText: {
    marginTop: 6,
    color: "#514a43",
    lineHeight: 1.45,
  },
  statusSwitch: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    padding: 4,
    minWidth: 210,
  },
  statusOption: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#514a43",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 850,
  },
  statusOptionOpenActive: {
    background: "#0f7a4a",
    color: "#fff",
  },
  statusOptionClosedActive: {
    background: "#991b1b",
    color: "#fff",
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
  dayLabel: {
    color: "#1c1a17",
    textTransform: "capitalize",
  },
  hint: {
    marginTop: 8,
    color: "#625b53",
    lineHeight: 1.45,
  },
};
