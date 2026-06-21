import type { CSSProperties } from "react";

const cardShadow = "0 12px 28px rgba(28, 26, 23, 0.05)";
const border = "1px solid rgba(28, 26, 23, 0.08)";

export const fat = {
  page: {
    display: "grid",
    gap: 14,
  } satisfies CSSProperties,

  toolbar: {
    display: "grid",
    gridTemplateColumns: "auto minmax(280px, 1fr)",
    alignItems: "center",
    gap: 12,
    padding: 12,
    background: "#fffdf8",
    border,
    borderRadius: 8,
    boxShadow: cardShadow,
    position: "sticky",
    top: 8,
    zIndex: 20,
  } satisfies CSSProperties,

  toolbarMobile: {
    gridTemplateColumns: "1fr",
    top: 0,
  } satisfies CSSProperties,

  viewSwitch: {
    display: "inline-flex",
    padding: 3,
    gap: 3,
    background: "#f0ebe2",
    borderRadius: 8,
    width: "fit-content",
  } satisfies CSSProperties,

  viewBtn: {
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#625b53",
    padding: "9px 14px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
  } satisfies CSSProperties,

  viewBtnActive: {
    background: "#1c1a17",
    color: "#fffdf8",
    boxShadow: "0 4px 12px rgba(28, 26, 23, 0.16)",
  } satisfies CSSProperties,

  toolbarRight: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
    alignItems: "center",
    gap: 10,
  } satisfies CSSProperties,

  toolbarRightStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  periodPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  } satisfies CSSProperties,

  periodBtn: {
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    background: "#fffdf8",
    color: "#625b53",
    padding: "8px 11px",
    cursor: "pointer",
    fontWeight: 850,
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
    minWidth: 0,
    width: "100%",
  } satisfies CSSProperties,

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    padding: "11px 13px 11px 36px",
    background: "#fff",
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
    borderRadius: 8,
    background: "#fce8eb",
    color: "#9f1d2f",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 850,
    width: "fit-content",
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

  summary: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1.35fr) repeat(4, minmax(150px, 1fr))",
    gap: 12,
  } satisfies CSSProperties,

  summaryStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  revenueCard: {
    background: "#fffdf8",
    border,
    borderRadius: 8,
    padding: 20,
    color: "#1c1a17",
    display: "grid",
    alignContent: "space-between",
    gap: 14,
    boxShadow: cardShadow,
    position: "relative",
    overflow: "hidden",
  } satisfies CSSProperties,

  revenueAccent: {
    position: "absolute",
    inset: "0 auto 0 0",
    width: 5,
    background: "#9f1d2f",
    pointerEvents: "none",
  } satisfies CSSProperties,

  heroLabel: {
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9f1d2f",
  } satisfies CSSProperties,

  heroValue: {
    fontSize: "clamp(30px, 4vw, 44px)",
    fontWeight: 950,
    lineHeight: 1,
    color: "#1c1a17",
  } satisfies CSSProperties,

  heroMeta: {
    fontSize: 13,
    color: "#625b53",
    fontWeight: 700,
  } satisfies CSSProperties,

  statCard: {
    background: "#fffdf8",
    border,
    borderRadius: 8,
    padding: 16,
    display: "grid",
    alignContent: "space-between",
    gap: 8,
    boxShadow: cardShadow,
    minHeight: 118,
  } satisfies CSSProperties,

  statLabel: {
    fontSize: 12,
    fontWeight: 850,
    color: "#625b53",
  } satisfies CSSProperties,

  statValue: {
    fontSize: "clamp(21px, 2.3vw, 28px)",
    fontWeight: 950,
    lineHeight: 1.05,
    color: "#1c1a17",
  } satisfies CSSProperties,

  statDetail: {
    fontSize: 12,
    color: "#766e64",
    fontWeight: 650,
    lineHeight: 1.35,
  } satisfies CSSProperties,

  bento: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.9fr)",
    gap: 14,
    alignItems: "start",
  } satisfies CSSProperties,

  bentoStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  panel: {
    background: "#fffdf8",
    border,
    borderRadius: 8,
    padding: 18,
    boxShadow: cardShadow,
    minWidth: 0,
  } satisfies CSSProperties,

  panelTight: {
    padding: 14,
  } satisfies CSSProperties,

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 12,
    marginBottom: 14,
  } satisfies CSSProperties,

  panelTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "#1c1a17",
    lineHeight: 1.15,
  } satisfies CSSProperties,

  panelSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#766e64",
    lineHeight: 1.4,
  } satisfies CSSProperties,

  panelBadge: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#625b53",
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  sideStack: {
    display: "grid",
    gap: 14,
  } satisfies CSSProperties,

  rankGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  } satisfies CSSProperties,

  rankGridStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  rankList: {
    display: "grid",
    gap: 8,
  } satisfies CSSProperties,

  rankItem: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    padding: "10px 11px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(28, 26, 23, 0.06)",
  } satisfies CSSProperties,

  rankIndex: {
    width: 30,
    height: 30,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 900,
    background: "#1c1a17",
    color: "#fffdf8",
  } satisfies CSSProperties,

  rankName: {
    display: "block",
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
    gap: 11,
  } satisfies CSSProperties,

  paymentItem: {
    display: "grid",
    gap: 7,
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
    height: 8,
    borderRadius: 999,
    background: "#f0ebe2",
    overflow: "hidden",
  } satisfies CSSProperties,

  paymentFillPix: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "#0f7a4a",
  } satisfies CSSProperties,

  paymentFillCard: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "#1d4ed8",
  } satisfies CSSProperties,

  paymentFillOther: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "#9f1d2f",
  } satisfies CSSProperties,

  customDates: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
    gap: 8,
  } satisfies CSSProperties,

  customDatesStack: {
    gridTemplateColumns: "1fr",
  } satisfies CSSProperties,

  dateInput: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#fff",
    fontSize: 13,
    outlineColor: "#9f1d2f",
  } satisfies CSSProperties,

  empty: {
    padding: "24px 12px",
    textAlign: "center",
    color: "#9a9288",
    fontSize: 13,
    lineHeight: 1.5,
  } satisfies CSSProperties,
};
