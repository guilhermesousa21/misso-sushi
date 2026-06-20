import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "taznskxoczjxnodylgnl.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/menu-images/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
