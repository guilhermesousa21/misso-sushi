"use client";

import type { CSSProperties } from "react";
import { Check, CreditCard, MapPin, UserRound } from "lucide-react";

export type CheckoutStep = 1 | 2 | 3;

const steps: {
  id: CheckoutStep;
  label: string;
  Icon: typeof UserRound;
}[] = [
  { id: 1, label: "Dados", Icon: UserRound },
  { id: 2, label: "Retirada", Icon: MapPin },
  { id: 3, label: "Pagamento", Icon: CreditCard },
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
      {steps.map((step) => {
        const { Icon } = step;
        const isActive = currentStep === step.id;
        const isComplete = step.id < currentStep;
        const isReachable = step.id <= maxReachableStep;

        return (
          <button
            key={step.id}
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
            <span
              style={{
                ...styles.stepIconWrap,
                ...(isActive ? styles.stepIconWrapActive : {}),
                ...(isComplete ? styles.stepIconWrapComplete : {}),
              }}
            >
              {isComplete ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Icon size={15} strokeWidth={2.2} />
              )}
            </span>
            <span style={styles.stepLabel}>{step.label}</span>
          </button>
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
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 8px 18px rgba(28, 26, 23, 0.035)",
  },
  stepperMobile: {
    padding: 8,
    gap: 6,
  },
  stepButton: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(28, 26, 23, 0.1)",
    borderRadius: 10,
    background: "#fff",
    color: "#625b53",
    padding: "10px 8px",
    cursor: "pointer",
    fontWeight: 850,
    display: "grid",
    justifyItems: "center",
    gap: 6,
    minHeight: 62,
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
  stepIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "rgba(28, 26, 23, 0.08)",
    display: "grid",
    placeItems: "center",
  },
  stepIconWrapActive: {
    background: "rgba(255, 253, 248, 0.14)",
    color: "#fffdf8",
  },
  stepIconWrapComplete: {
    background: "rgba(15, 122, 74, 0.12)",
    color: "#0f7a4a",
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 1.1,
  },
};
