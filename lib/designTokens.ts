export const colors = {
  bg: "#f7f4ef",
  surface: "#fffdf8",
  text: "#1c1a17",
  textMuted: "#625b53",
  textSubtle: "#766e64",
  brand: "#9b1c31",
  brandDark: "#821428",
  dark: "#1c1a17",
  warm: "#f0ebe2",
  warmBorder: "#ebe3d6",
  success: "#0f7a4a",
  error: "#991b1b",
  errorBg: "#fee2e2",
} as const;

export const fonts = {
  body: "var(--font-dm-sans), system-ui, sans-serif",
  brand: "var(--font-dm-serif), Georgia, serif",
} as const;

export const shadows = {
  card: "0 14px 35px rgba(28, 26, 23, 0.06)",
  cardHover: "0 20px 44px rgba(28, 26, 23, 0.12)",
  float: "0 18px 45px rgba(28, 26, 23, 0.24)",
} as const;
