import "./globals.css";
import { CartProvider } from "./context/CartContext";

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
    <html lang="pt-br">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#f7f4ef",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
