"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { getButtonStyle, type ButtonSize, type ButtonVariant } from "../../../lib/uiStyles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...getButtonStyle(variant, size, fullWidth),
        ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
