import type { CSSProperties } from "react";
import { colors } from "./designTokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

export function getButtonStyle(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false
): CSSProperties {
  const base: CSSProperties = {
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 850,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease",
    fontFamily: "inherit",
  };

  const sizes: Record<ButtonSize, CSSProperties> = {
    sm: { padding: "9px 14px", fontSize: 13 },
    md: { padding: "12px 16px", fontSize: 14 },
    lg: { padding: "15px 18px", fontSize: 16 },
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: colors.brand,
      color: colors.surface,
      boxShadow: "0 14px 28px rgba(159, 29, 47, 0.22)",
    },
    secondary: {
      background: colors.dark,
      color: colors.surface,
      boxShadow: "0 10px 22px rgba(28, 26, 23, 0.14)",
    },
    ghost: {
      background: colors.surface,
      color: colors.brandDark,
      border: "1px solid rgba(28, 26, 23, 0.1)",
      boxShadow: "0 8px 20px rgba(28, 26, 23, 0.06)",
    },
    dark: {
      background: colors.dark,
      color: colors.surface,
    },
  };

  return {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(fullWidth ? { width: "100%" } : {}),
  };
}

export function getInputStyle(): CSSProperties {
  return {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 10,
    padding: "13px 14px",
    background: "#fff",
    color: colors.text,
    outlineColor: colors.brand,
    fontSize: 15,
    fontFamily: "inherit",
  };
}

export function getSelectStyle(): CSSProperties {
  return getInputStyle();
}

export function getTextareaStyle(): CSSProperties {
  return {
    ...getInputStyle(),
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.45,
  };
}

export function getFieldStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 7,
  };
}

export function getLabelStyle(): CSSProperties {
  return {
    fontSize: 14,
    fontWeight: 850,
    color: "#514a43",
  };
}

export function getCardStyle(variant: "surface" | "dark" = "surface"): CSSProperties {
  if (variant === "dark") {
    return {
      background: "#171512",
      color: colors.surface,
      border: "1px solid rgba(255, 253, 248, 0.08)",
      borderRadius: 12,
      padding: 22,
      boxShadow: "0 16px 36px rgba(23, 21, 18, 0.16)",
    };
  }

  return {
    background: colors.surface,
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 8px 18px rgba(28, 26, 23, 0.035)",
  };
}

export function getBadgeStyle(
  variant: "brand" | "success" | "error" | "neutral" | "dark" = "neutral"
): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const variants: Record<typeof variant, CSSProperties> = {
    brand: { background: "rgba(159, 29, 47, 0.1)", color: colors.brand },
    success: { background: "rgba(15, 122, 74, 0.12)", color: colors.success },
    error: { background: colors.errorBg, color: colors.error },
    neutral: { background: colors.warm, color: colors.textMuted },
    dark: { background: "rgba(255, 253, 248, 0.12)", color: colors.surface },
  };

  return { ...base, ...variants[variant] };
}

export const eyebrowStyle: CSSProperties = {
  color: colors.brand,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
