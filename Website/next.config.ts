import type { NextConfig } from "next";

function apiImagePattern() {
  const origin =
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    process.env.API_ORIGIN ||
    "https://taxi-software.onrender.com";
  try {
    const url = new URL(origin);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/uploads/**" as const,
    };
  } catch {
    return {
      protocol: "https" as const,
      hostname: "taxi-software.onrender.com",
      pathname: "/uploads/**" as const,
    };
  }
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      apiImagePattern(),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
