"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

type BackToMenuLinkProps = {
  variant?: "inline" | "header";
  label?: string;
};

export function BackToMenuLink({
  variant = "inline",
  label = "Voltar ao cardápio",
}: BackToMenuLinkProps) {
  return (
    <Link
      href="/"
      style={{
        ...styles.base,
        ...(variant === "header" ? styles.header : styles.inline),
      }}
    >
      <span style={styles.icon} aria-hidden>
        ←
      </span>
      <span>{label}</span>
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
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  inline: {
    marginBottom: 20,
  },
  header: {
    position: "absolute",
    left: 0,
    top: 18,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(159, 29, 47, 0.08)",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 900,
    flexShrink: 0,
  },
};
