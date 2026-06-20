"use client";

import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  style?: CSSProperties;
};

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <span
      className="skeleton-shimmer"
      aria-hidden
      style={{ display: "block", width, height, borderRadius, ...style }}
    />
  );
}
