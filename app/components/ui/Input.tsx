"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { getFieldStyle, getInputStyle, getLabelStyle } from "../../../lib/uiStyles";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  containerStyle?: CSSProperties;
};

export function Input({ label, hint, containerStyle, style, id, ...props }: InputProps) {
  const inputId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label style={{ ...getFieldStyle(), ...containerStyle }} htmlFor={inputId}>
      {label && <span style={getLabelStyle()}>{label}</span>}
      <input id={inputId} style={{ ...getInputStyle(), ...style }} {...props} />
      {hint}
    </label>
  );
}
