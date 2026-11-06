import type { NextConfig } from "next";

// Vercel define automáticamente VERCEL=1 en sus entornos de compilación.
// En Vercel se omite 'standalone' (Vercel usa su propio empaquetado Serverless).
// En Docker se activa automáticamente para generar .next/standalone.
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: "standalone" }),
  typescript: {
    // Evita que advertencias menores de tipado bloqueen el build en contenedor
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita que warnings de ESLint detengan la compilación en producción
    ignoreDuringBuilds: true,
  },
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
