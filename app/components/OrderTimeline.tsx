"use client";

import type { CSSProperties } from "react";
import {
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import { colors } from "../../lib/designTokens";

export type TimelineStep = {
  key: string;
  label: string;
  doneText: string;
};

type OrderTimelineProps = {
  steps: TimelineStep[];
  currentIndex: number;
  isPaid: boolean;
};

const stepIcons: Record<string, typeof Wallet> = {
  aguardando_pagamento: Wallet,
  recebido: ClipboardCheck,
  preparando: ChefHat,
  pronto: CheckCircle2,
  retirado: Check,
};

export function OrderTimeline({ steps, currentIndex, isPaid }: OrderTimelineProps) {
  return (
    <div style={styles.timeline} className="order-timeline">
      {steps.map((step, index) => {
        const isPaymentStep = step.key === "aguardando_pagamento";
        const active = isPaymentStep ? isPaid : index <= currentIndex;
        const current = isPaymentStep ? !isPaid : index === currentIndex;
        const Icon = stepIcons[step.key] || Check;
        const label =
          isPaymentStep && isPaid ? "Pagamento confirmado" : step.label;
        const statusText = active ? step.doneText : "Aguardando";

        return (
          <div
            key={step.key}
            style={{
              ...styles.step,
              ...(active ? styles.stepActive : {}),
              ...(current ? styles.stepCurrent : {}),
            }}
          >
            <div style={styles.stepRail} aria-hidden>
              <span
                className={
                  current && active
                    ? "timeline-dot timeline-dot--done"
                    : current && !active
                      ? "timeline-dot timeline-dot--pending"
                      : active
                        ? "timeline-dot"
                        : undefined
                }
                style={{
                  ...styles.stepIconWrap,
                  ...(active ? styles.stepIconWrapActive : {}),
                  ...(current && !active ? styles.stepIconWrapPending : {}),
                }}
              >
                {active ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <Icon size={14} strokeWidth={2.2} />
                )}
              </span>
              {index < steps.length - 1 && (
                <span
                  style={{
                    ...styles.connector,
                    ...(index < currentIndex || (isPaid && index === 0)
                      ? styles.connectorActive
                      : {}),
                  }}
                />
              )}
            </div>
            <div style={styles.stepContent}>
              <strong style={styles.stepTitle}>{label}</strong>
              <p style={styles.stepText}>{statusText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  timeline: {
    marginTop: 24,
    display: "grid",
    gap: 0,
  },
  step: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr)",
    gap: 14,
    alignItems: "start",
    padding: "12px 0",
  },
  stepActive: {},
  stepCurrent: {
    background: "linear-gradient(90deg, rgba(159, 29, 47, 0.04), transparent)",
    borderRadius: 12,
    paddingInline: 10,
    marginInline: -10,
  },
  stepRail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    minHeight: 52,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "2px solid #d8d0c4",
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    color: colors.textSubtle,
    flexShrink: 0,
    zIndex: 1,
  },
  stepIconWrapActive: {
    background: colors.success,
    borderColor: colors.success,
    color: "#fff",
  },
  stepIconWrapPending: {
    background: colors.error,
    borderColor: colors.error,
    color: "#fff",
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginTop: 4,
    background: "#e4ddd2",
    borderRadius: 999,
  },
  connectorActive: {
    background: colors.success,
  },
  stepContent: {
    paddingTop: 4,
  },
  stepTitle: {
    display: "block",
    lineHeight: 1.25,
    fontSize: 15,
  },
  stepText: {
    marginTop: 4,
    color: colors.textSubtle,
    fontSize: 13,
  },
};
