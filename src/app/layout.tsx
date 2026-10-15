import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import "./components.css";
import { SmoothCursor } from "@/registry/magicui/smooth-cursor";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interlocapp.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "InterlocApp: Transporte Interlocal Moderno",
    template: "%s | InterlocApp",
  },
  description: "Plataforma oficial para compra de boletos, selección de asientos en tiempo real y gestión de flotas interlocales.",
  applicationName: "InterlocApp",
  keywords: ["transporte interlocal", "boletos", "nicaragua", "viajes", "interlocapp", "cooperativas"],
  authors: [{ name: "InterlocApp" }],
  creator: "InterlocApp",
  publisher: "InterlocApp",
  openGraph: {
    type: "website",
    locale: "es_NI",
    url: appUrl,
    siteName: "InterlocApp",
    title: "InterlocApp: Transporte Interlocal Moderno",
    description: "Plataforma oficial para compra de boletos, selección de asientos en tiempo real y gestión de flotas interlocales.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InterlocApp: Transporte Interlocal Moderno",
      },
      {
        url: "/og-square.png",
        width: 600,
        height: 600,
        alt: "Logo InterlocApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InterlocApp: Transporte Interlocal Moderno",
    description: "Plataforma oficial para compra de boletos, selección de asientos en tiempo real y gestión de flotas interlocales.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=20261015", type: "image/svg+xml" },
      { url: "/favicon.ico?v=20261015", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico?v=20261015",
    apple: "/apple-touch-icon.png?v=20261015",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg?v=20261015" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico?v=20261015" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261015" />
        <meta property="og:image" content={`${appUrl}/og-image.png`} />
        <meta property="og:image:secure_url" content={`${appUrl}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
      </head>
      <body>
        <SmoothCursor />
        {children}
      </body>
    </html>
  );
}
