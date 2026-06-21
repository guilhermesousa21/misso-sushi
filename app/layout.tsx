import "./globals.css";
import type { Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "./context/CartContext";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Missô Sushi - Cardápio Online",
  description: "Peça online direto do Missô Sushi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "var(--color-bg)",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        }}
      >
        <CartProvider>{children}</CartProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1c1a17",
              color: "#fffdf8",
              fontWeight: 700,
              borderRadius: 999,
              padding: "10px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
