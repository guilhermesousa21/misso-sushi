"use client";

import type { CSSProperties, ReactNode } from "react";
import { getBadgeStyle } from "../../../lib/uiStyles";

type BadgeVariant = "brand" | "success" | "error" | "neutral" | "dark";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
};

export function Badge({ variant = "neutral", children, style }: BadgeProps) {
  return <span style={{ ...getBadgeStyle(variant), ...style }}>{children}</span>;
}
