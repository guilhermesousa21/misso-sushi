"use client";

import type { CSSProperties, ReactNode } from "react";
import { getCardStyle } from "../../../lib/uiStyles";

type CardProps = {
  variant?: "surface" | "dark";
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function Card({ variant = "surface", children, style, className }: CardProps) {
  return (
    <div className={className} style={{ ...getCardStyle(variant), ...style }}>
      {children}
    </div>
  );
}
