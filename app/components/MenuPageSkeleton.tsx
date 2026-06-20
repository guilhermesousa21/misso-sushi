"use client";

import type { CSSProperties } from "react";
import { Skeleton } from "./Skeleton";

type MenuPageSkeletonProps = {
  isMobile?: boolean;
};

export function MenuPageSkeleton({ isMobile = false }: MenuPageSkeletonProps) {
  const cardCount = isMobile ? 4 : 6;

  return (
    <div style={styles.wrap} aria-busy="true" aria-label="Carregando cardápio">
      <nav style={styles.categoryNav}>
        <Skeleton height={46} borderRadius={10} />
        <div style={{ ...styles.categoryBar, ...(isMobile ? styles.categoryBarMobile : {}) }}>
          {Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => (
            <Skeleton key={index} width={isMobile ? 92 : 108} height={38} borderRadius={999} />
          ))}
        </div>
      </nav>

      <section style={{ ...styles.section, ...(isMobile ? styles.sectionMobile : {}) }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionHeading}>
            <Skeleton width={72} height={12} />
            <Skeleton width={isMobile ? 160 : 220} height={28} style={{ marginTop: 8 }} />
          </div>
          <Skeleton width={64} height={28} borderRadius={999} />
        </div>

        <div style={{ ...styles.menuGrid, ...(isMobile ? styles.menuGridMobile : {}) }}>
          {Array.from({ length: cardCount }).map((_, index) => (
            <article
              key={index}
              style={{ ...styles.menuCard, ...(isMobile ? styles.menuCardMobile : {}) }}
            >
              <Skeleton
                height={isMobile ? 92 : 120}
                borderRadius={8}
                style={{ ...(isMobile ? styles.imageMobile : styles.imageDesktop) }}
              />
              <div style={{ ...styles.cardBody, ...(isMobile ? styles.cardBodyMobile : {}) }}>
                <Skeleton width="78%" height={18} />
                <Skeleton width="100%" height={12} style={{ marginTop: 10 }} />
                <Skeleton width="92%" height={12} style={{ marginTop: 6 }} />
                <div style={styles.cardFooter}>
                  <Skeleton width={72} height={22} />
                  <Skeleton width={isMobile ? 92 : 108} height={38} borderRadius={999} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 18,
  },
  categoryNav: {
    display: "grid",
    gap: 12,
  },
  categoryBar: {
    display: "flex",
    gap: 8,
    overflow: "hidden",
  },
  categoryBarMobile: {
    gap: 6,
  },
  section: {
    display: "grid",
    gap: 16,
  },
  sectionMobile: {
    gap: 12,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
  },
  sectionHeading: {
    display: "grid",
    gap: 0,
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  menuGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  menuCard: {
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 1fr)",
    gap: 14,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 10,
    padding: 14,
  },
  menuCardMobile: {
    gridTemplateColumns: "92px minmax(0, 1fr)",
    gap: 12,
    padding: 12,
  },
  imageDesktop: {
    width: 120,
  },
  imageMobile: {
    width: 92,
  },
  cardBody: {
    display: "grid",
    alignContent: "space-between",
    gap: 12,
    minHeight: 120,
  },
  cardBodyMobile: {
    minHeight: 92,
    gap: 10,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
};
