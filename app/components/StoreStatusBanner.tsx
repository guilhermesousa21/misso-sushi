"use client";

import type { CSSProperties } from "react";
import { getNextOpeningLabel, type BusinessHours } from "../../lib/storeHours";

type StoreStatusBannerProps = {
  storeOpen: boolean;
  manualOpen: boolean;
  businessHours: BusinessHours;
  averageTime?: string;
};

export function StoreStatusBanner({
  storeOpen,
  manualOpen,
  businessHours,
  averageTime = "35 a 50 min",
}: StoreStatusBannerProps) {
  if (storeOpen) {
    return (
      <div style={styles.openBanner} role="status" aria-live="polite">
        <span style={styles.openDot} aria-hidden />
        <div style={styles.bannerText}>
          <strong>Aberto agora</strong>
          <span>Retirada em cerca de {averageTime}</span>
        </div>
      </div>
    );
  }

  const nextOpening = getNextOpeningLabel(new Date(), businessHours);
  const nextOpeningLabel = nextOpening.charAt(0).toUpperCase() + nextOpening.slice(1);
  const reason = !manualOpen
    ? "Pedidos online pausados no momento."
    : "Estamos fora do horário de funcionamento.";

  return (
    <div style={styles.closedBanner} role="status" aria-live="polite">
      <span style={styles.closedIcon} aria-hidden>
        !
      </span>
      <div style={styles.bannerText}>
        <strong>Pedidos indisponíveis agora</strong>
        <span style={styles.nextOpening}>{nextOpeningLabel}</span>
        <span style={styles.closedReason}>{reason}</span>
      </div>
    </div>
  );
}

export const storeStatusBannerHeight = 56;

const styles: Record<string, CSSProperties> = {
  openBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    background: "#ecfdf3",
    borderBottom: "1px solid rgba(15, 122, 74, 0.18)",
    color: "#14532d",
    boxShadow: "0 8px 24px rgba(15, 122, 74, 0.08)",
  },
  closedBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 16px",
    background: "#991b1b",
    borderBottom: "1px solid rgba(127, 29, 29, 0.35)",
    color: "#fff",
    boxShadow: "0 10px 28px rgba(153, 27, 27, 0.22)",
  },
  openDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#16a34a",
    boxShadow: "0 0 0 4px rgba(22, 163, 74, 0.18)",
    flexShrink: 0,
    marginTop: 4,
  },
  closedIcon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 14,
    flexShrink: 0,
  },
  bannerText: {
    display: "grid",
    gap: 2,
    fontSize: 13,
    lineHeight: 1.35,
  },
  nextOpening: {
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.25,
  },
  closedReason: {
    opacity: 0.88,
    fontSize: 12,
  },
};
