import type { CSSProperties } from "react";

export const fat = {
  page: {
    display: "grid",
    gap: 16,
  } satisfies CSSProperties,

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(28, 26, 23, 0.04)",
    position: "sticky",
    top: 8,
    zIndex: 20,
  } satisfies CSSProperties,

  viewSwitch: {
    display: "inline-flex",
    padding: 4,
    gap: 4,
    background: "#f3efe8",
    borderRadius: 12,
  } satisfies CSSProperties,

  viewBtn: {
    border: "none",
    borderRadius: 9,
    background: "transparent",
    color: "#625b53",
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
  } satisfies CSSProperties,

  viewBtnActive: {
    background: "#fff",
    color: "#1c1a17",
    boxShadow: "0 2px 8px rgba(28, 26, 23, 0.08)",
  } satisfies CSSProperties,

  toolbarRight: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    flex: "1 1 280px",
    justifyContent: "flex-end",
  } satisfies CSSProperties,

  periodPills: {
    display: "inline-flex",
    flexWrap: "wrap",
    gap: 6,
  } satisfies CSSProperties,

  periodBtn: {
    border: "1px solid transparent",
    borderRadius: 999,
    background: "#faf8f4",
    color: "#625b53",
    padding: "8px 13px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  periodBtnActive: {
    background: "#9f1d2f",
    color: "#fffdf8",
    borderColor: "#9f1d2f",
  } satisfies CSSProperties,

  searchWrap: {
    position: "relative",
    minWidth: "min(100%, 240px)",
    flex: "1 1 200px",
    maxWidth: 320,
  } satisfies CSSProperties,

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 999,
    padding: "10px 14px 10px 36px",
    background: "#faf8f4",
    color: "#1c1a17",
    fontSize: 13,
    outlineColor: "#9f1d2f",
  } satisfies CSSProperties,

  searchIcon: {
    position: "absolute",
    left: 13,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9a9288",
    fontSize: 14,
    pointerEvents: "none",
  } satisfies CSSProperties,

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    background: "#fce8eb",
    color: "#9f1d2f",
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 850,
  } satisfies CSSProperties,

  chipBtn: {
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 900,
    padding: 0,
    lineHeight: 1,
    fontSize: 16,
  } satisfies CSSProperties,

  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) repeat(4, minmax(0, 1fr))",
    gap: 12,
    minHeight: 148,
  } satisfies CSSProperties,

  heroMobile: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  heroMain: {
    background: "#000000",
    borderRadius: 20,
    padding: "22px 24px",
    color: "#fffdf8",
    display: "grid",
    alignContent: "space-between",
    gap: 12,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
  } satisfies CSSProperties,

  heroGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  } satisfies CSSProperties,

  heroLabel: {
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,253,248,0.65)",
  } satisfies CSSProperties,

  heroValue: {
    fontSize: "clamp(28px, 4vw, 40px)",
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
  } satisfies CSSProperties,

  heroMeta: {
    fontSize: 13,
    color: "rgba(255,253,248,0.72)",
    fontWeight: 650,
  } satisfies CSSProperties,

  statCard: {
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 16,
    padding: "16px 18px",
    display: "grid",
    alignContent: "space-between",
    gap: 8,
    boxShadow: "0 4px 20px rgba(28, 26, 23, 0.04)",
  } satisfies CSSProperties,

  statLabel: {
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9a9288",
  } satisfies CSSProperties,

  statValue: {
    fontSize: "clamp(20px, 2.5vw, 26px)",
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#1c1a17",
  } satisfies CSSProperties,

  statDetail: {
    fontSize: 12,
    color: "#766e64",
    fontWeight: 650,
  } satisfies CSSProperties,

  bento: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.55fr) minmax(280px, 1fr)",
    gap: 14,
    alignItems: "start",
  } satisfies CSSProperties,

  bentoStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  panel: {
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.07)",
    borderRadius: 18,
    padding: "18px 20px",
    boxShadow: "0 4px 20px rgba(28, 26, 23, 0.04)",
    minWidth: 0,
  } satisfies CSSProperties,

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  } satisfies CSSProperties,

  panelTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: "#1c1a17",
    letterSpacing: "-0.01em",
  } satisfies CSSProperties,

  panelBadge: {
    borderRadius: 999,
    background: "#f3efe8",
    color: "#625b53",
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 850,
  } satisfies CSSProperties,

  sideStack: {
    display: "grid",
    gap: 14,
  } satisfies CSSProperties,

  rankList: {
    display: "grid",
    gap: 8,
  } satisfies CSSProperties,

  rankItem: {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#faf8f4",
    border: "1px solid rgba(28, 26, 23, 0.05)",
  } satisfies CSSProperties,

  rankIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 900,
    background: "#1c1a17",
    color: "#fffdf8",
  } satisfies CSSProperties,

  rankName: {
    fontSize: 13,
    fontWeight: 850,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  rankSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#9a9288",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  rankValue: {
    fontSize: 13,
    fontWeight: 900,
    whiteSpace: "nowrap",
    color: "#9f1d2f",
  } satisfies CSSProperties,

  paymentRow: {
    display: "grid",
    gap: 10,
  } satisfies CSSProperties,

  paymentItem: {
    display: "grid",
    gap: 6,
  } satisfies CSSProperties,

  paymentLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    fontWeight: 750,
    color: "#514a43",
  } satisfies CSSProperties,

  paymentBar: {
    height: 6,
    borderRadius: 999,
    background: "#f0ebe2",
    overflow: "hidden",
  } satisfies CSSProperties,

  paymentFillPix: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #0f7a4a, #34d399)",
  } satisfies CSSProperties,

  paymentFillCard: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #1d4ed8, #60a5fa)",
  } satisfies CSSProperties,

  paymentFillOther: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #9f1d2f, #d45a6a)",
  } satisfies CSSProperties,

  empty: {
    padding: "24px 12px",
    textAlign: "center",
    color: "#9a9288",
    fontSize: 13,
    lineHeight: 1.5,
  } satisfies CSSProperties,

  customDates: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    marginTop: 10,
  } satisfies CSSProperties,

  dateInput: {
    flex: "1 1 130px",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 10,
    padding: "9px 12px",
    background: "#faf8f4",
    fontSize: 13,
    outlineColor: "#9f1d2f",
  } satisfies CSSProperties,
};
