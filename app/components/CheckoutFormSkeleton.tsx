"use client";

import type { CSSProperties } from "react";
import { Skeleton } from "./Skeleton";

type CheckoutFormSkeletonProps = {
  isMobile?: boolean;
};

export function CheckoutFormSkeleton({ isMobile = false }: CheckoutFormSkeletonProps) {
  return (
    <main
      style={{
        ...styles.page,
        ...(isMobile ? styles.pageMobile : {}),
      }}
      aria-busy="true"
      aria-label="Carregando checkout"
    >
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <Skeleton width={132} height={38} borderRadius={999} style={isMobile ? { alignSelf: "flex-start" } : undefined} />
        <div style={{ ...styles.headerTitle, ...(isMobile ? styles.headerTitleMobile : {}) }}>
          <Skeleton width={88} height={12} style={{ margin: "0 auto" }} />
          <Skeleton width={220} height={34} style={{ margin: "8px auto 0" }} />
        </div>
      </header>

      <div style={{ ...styles.shell, ...(isMobile ? styles.shellMobile : {}) }}>
        <section style={styles.mainColumn}>
          <div style={styles.stepper}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={58} borderRadius={8} />
            ))}
          </div>

          <div style={styles.card}>
            <Skeleton width={180} height={22} />
            <div style={{ ...styles.formGrid, ...(isMobile ? styles.formGridMobile : {}) }}>
              <Skeleton height={72} borderRadius={8} />
              <Skeleton height={72} borderRadius={8} />
            </div>
            <Skeleton width="72%" height={14} style={{ marginTop: 12 }} />
          </div>

          <div style={styles.card}>
            <Skeleton width={120} height={22} />
            <Skeleton height={48} borderRadius={8} style={{ marginTop: 14 }} />
            <Skeleton width="58%" height={14} style={{ marginTop: 12 }} />
          </div>

          <Skeleton height={48} borderRadius={999} style={{ width: isMobile ? "100%" : 160, marginLeft: "auto" }} />
        </section>

        {!isMobile && (
          <aside style={styles.summaryColumn}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryHeader}>
                <div>
                  <Skeleton width={64} height={11} />
                  <Skeleton width={140} height={24} style={{ marginTop: 8 }} />
                </div>
                <Skeleton width={72} height={28} borderRadius={999} />
              </div>
              <div style={styles.summaryList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} style={styles.summaryRow}>
                    <div style={{ flex: 1 }}>
                      <Skeleton width="70%" height={16} />
                      <Skeleton width="42%" height={12} style={{ marginTop: 6 }} />
                    </div>
                    <Skeleton width={56} height={16} />
                  </div>
                ))}
              </div>
              <Skeleton height={28} style={{ marginTop: 18 }} />
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f1ea",
    color: "#171512",
    padding: "20px 20px 48px",
  },
  pageMobile: {
    padding: "18px 14px calc(110px + env(safe-area-inset-bottom, 0px))",
  },
  header: {
    maxWidth: 1180,
    margin: "0 auto 16px",
    position: "relative",
    display: "grid",
    justifyItems: "center",
    textAlign: "center",
    paddingTop: 18,
  },
  headerMobile: {
    paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
    marginBottom: 4,
  },
  headerTitle: {
    textAlign: "center",
  },
  headerTitleMobile: {
    width: "100%",
  },
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 378px",
    gap: 20,
    alignItems: "start",
  },
  shellMobile: {
    gridTemplateColumns: "1fr",
  },
  mainColumn: {
    display: "grid",
    gap: 10,
  },
  stepper: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    padding: 10,
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 10,
    padding: 18,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 14,
  },
  formGridMobile: {
    gridTemplateColumns: "1fr",
  },
  summaryColumn: {
    position: "sticky",
    top: 20,
  },
  summaryCard: {
    background: "#171512",
    borderRadius: 8,
    padding: 22,
  },
  summaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 18,
  },
  summaryList: {
    display: "grid",
    gap: 13,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 13,
    borderBottom: "1px solid rgba(255, 253, 248, 0.12)",
  },
};
