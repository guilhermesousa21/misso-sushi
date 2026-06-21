"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "../../lib/useMediaQuery";

type BackToMenuLinkProps = {
  variant?: "inline" | "header";
  label?: string;
};

export function BackToMenuLink({
  variant = "inline",
  label = "Voltar ao cardápio",
}: BackToMenuLinkProps) {
  const isMobile = useIsMobile();
  const displayLabel = variant === "header" && isMobile ? "Cardápio" : label;

  return (
    <Link
      href="/"
      style={{
        ...styles.base,
        ...(variant === "header" ? styles.header : styles.inline),
        ...(variant === "header" && isMobile ? styles.headerMobile : {}),
      }}
    >
      <span style={styles.icon} aria-hidden>
        <ArrowLeft size={14} strokeWidth={2.5} />
      </span>
      <span style={styles.label}>{displayLabel}</span>
    </Link>
  );
}

const styles: Record<string, CSSProperties> = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#8f1728",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 850,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 999,
    padding: "10px 14px",
    boxShadow: "0 8px 20px rgba(28, 26, 23, 0.06)",
    lineHeight: 1,
  },
  inline: {
    marginBottom: 20,
  },
  header: {
    position: "absolute",
    left: 0,
    top: 18,
    zIndex: 2,
  },
  headerMobile: {
    padding: "9px 12px",
    maxWidth: "42vw",
  },
  label: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(159, 29, 47, 0.08)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    color: "#9f1d2f",
  },
};
