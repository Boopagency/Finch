import type { NextConfig } from "next";

// cacheComponents desligado de propósito (D-016): app 100% autenticado e dinâmico.
const nextConfig: NextConfig = {
  // telas já vistas voltam na hora (30 s); abas pré-carregadas por inteiro valem 90 s.
  // Qualquer ação que muda dados (server action com revalidatePath, router.refresh) limpa esse cache.
  experimental: { staleTimes: { dynamic: 30, static: 90 } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
