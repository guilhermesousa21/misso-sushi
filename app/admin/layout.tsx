import type { Metadata, Viewport } from "next";
import "./admin-mobile.css";

export const metadata: Metadata = {
  title: "Missô Admin",
  description: "Gestão operacional do Missô Sushi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Missô Admin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fffdf8",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
