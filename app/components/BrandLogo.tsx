"use client";

import type { CSSProperties } from "react";
import { fonts, colors } from "../../lib/designTokens";

type BrandLogoProps = {
  size?: "sm" | "md";
};

export function BrandLogo({ size = "md" }: BrandLogoProps) {
  const isSmall = size === "sm";

  return (
    <div style={{ ...styles.wrap, ...(isSmall ? styles.wrapSm : {}) }}>
      <div style={{ ...styles.mark, ...(isSmall ? styles.markSm : {}) }} aria-hidden>
        <span style={styles.markLetter}>M</span>
      </div>
      <div>
        <span style={{ ...styles.name, ...(isSmall ? styles.nameSm : {}) }}>Missô</span>
        <span style={{ ...styles.sub, ...(isSmall ? styles.subSm : {}) }}>Sushi</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  wrapSm: {
    gap: 9,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: `linear-gradient(145deg, ${colors.brand}, ${colors.brandDark})`,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 8px 20px rgba(159, 29, 47, 0.28)",
    flexShrink: 0,
  },
  markSm: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  markLetter: {
    color: colors.surface,
    fontFamily: fonts.brand,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  name: {
    display: "block",
    fontFamily: fonts.brand,
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1,
    color: colors.text,
    letterSpacing: "-0.02em",
  },
  nameSm: {
    fontSize: 21,
  },
  sub: {
    display: "block",
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: colors.brand,
  },
  subSm: {
    fontSize: 10,
    marginTop: 1,
  },
};
