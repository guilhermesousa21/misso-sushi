"use client";

import type { CSSProperties } from "react";

export type CheckoutStep = 1 | 2 | 3;

const steps: { id: CheckoutStep; label: string }[] = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Retirada" },
  { id: 3, label: "Pagamento" },
];

type CheckoutStepperProps = {
  currentStep: CheckoutStep;
  maxReachableStep: CheckoutStep;
  onStepChange: (step: CheckoutStep) => void;
  isMobile?: boolean;
};

export function CheckoutStepper({
  currentStep,
  maxReachableStep,
  onStepChange,
  isMobile = false,
}: CheckoutStepperProps) {
  return (
    <nav
      aria-label="Etapas do checkout"
      style={{ ...styles.stepper, ...(isMobile ? styles.stepperMobile : {}) }}
    >
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isComplete = step.id < currentStep;
        const isReachable = step.id <= maxReachableStep;
        const connectorActive = step.id < currentStep;

        return (
          <div key={step.id} style={styles.stepItem}>
            {index > 0 && (
              <span
                style={{
                  ...styles.connector,
                  ...(connectorActive ? styles.connectorActive : {}),
                }}
                aria-hidden
              />
            )}
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepChange(step.id)}
              style={{
                ...styles.stepButton,
                ...(isActive ? styles.stepButtonActive : {}),
                ...(isComplete ? styles.stepButtonComplete : {}),
                ...(!isReachable ? styles.stepButtonDisabled : {}),
              }}
              aria-current={isActive ? "step" : undefined}
            >
              <span style={styles.stepIndex}>{step.id}</span>
              <span style={styles.stepLabel}>{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

const styles: Record<string, CSSProperties> = {
  stepper: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    marginBottom: 14,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: 10,
    boxShadow: "0 8px 18px rgba(28, 26, 23, 0.035)",
  },
  stepperMobile: {
    padding: 8,
    gap: 6,
  },
  stepItem: {
    position: "relative",
    display: "grid",
  },
  connector: {
    display: "none",
  },
  connectorActive: {},
  stepButton: {
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 8,
    background: "#fff",
    color: "#625b53",
    padding: "10px 8px",
    cursor: "pointer",
    fontWeight: 850,
    display: "grid",
    justifyItems: "center",
    gap: 4,
    minHeight: 58,
  },
  stepButtonActive: {
    background: "#1c1a17",
    borderColor: "#1c1a17",
    color: "#fffdf8",
    boxShadow: "0 10px 22px rgba(28, 26, 23, 0.14)",
  },
  stepButtonComplete: {
    background: "#f0ebe2",
    borderColor: "rgba(28, 26, 23, 0.08)",
    color: "#1c1a17",
  },
  stepButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(28, 26, 23, 0.08)",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 1.1,
  },
};
