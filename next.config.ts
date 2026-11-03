import type { NextConfig } from "next";

// Vercel define automáticamente VERCEL=1 en sus entornos de compilación.
// En Vercel se debe omitir 'standalone' (Vercel usa su propio empaquetado Serverless).
// En Docker o local se activa 'standalone' para generar .next/standalone.
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: "standalone" }),
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
      },
    ];
  },
};

export default nextConfig;
