"use client";

import type { CSSProperties } from "react";
import Image from "next/image";

type BrandLogoProps = {
  size?: "sm" | "md";
  /** light = fundos claros (Missô preto); dark = fundos escuros (Missô branco) */
  variant?: "light" | "dark";
};

const heights = {
  sm: 30,
  md: 40,
} as const;

const logoDimensions = {
  light: { width: 1042, height: 173 },
  dark: { width: 627, height: 104 },
} as const;

export function BrandLogo({ size = "md", variant = "light" }: BrandLogoProps) {
  const src = variant === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png";
  const height = heights[size];
  const { width, height: intrinsicHeight } = logoDimensions[variant];
  const displayWidth = Math.round((width / intrinsicHeight) * height);

  return (
    <div style={{ ...styles.wrap, height, width: displayWidth }} aria-label="Missô Sushi">
      <Image
        src={src}
        alt="Missô Sushi"
        width={width}
        height={intrinsicHeight}
        priority={size === "md"}
        style={{
          height,
          width: displayWidth,
          objectFit: "contain",
        }}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};
