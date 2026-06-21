"use client";

import type { CSSProperties, ReactNode, SelectHTMLAttributes } from "react";
import { getFieldStyle, getLabelStyle, getSelectStyle } from "../../../lib/uiStyles";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  containerStyle?: CSSProperties;
};

export function Select({ label, hint, containerStyle, style, id, children, ...props }: SelectProps) {
  const selectId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label style={{ ...getFieldStyle(), ...containerStyle }} htmlFor={selectId}>
      {label && <span style={getLabelStyle()}>{label}</span>}
      <select id={selectId} style={{ ...getSelectStyle(), ...style }} {...props}>
        {children}
      </select>
      {hint}
    </label>
  );
}
