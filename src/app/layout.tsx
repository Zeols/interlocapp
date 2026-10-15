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

export const metadata: Metadata = {
  title: "InterlocApp",
  description: "Plataforma oficial para compra de boletos, selección de asientos y gestión de flotas interlocales.",
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
      </head>
      <body>
        <SmoothCursor />
        {children}
      </body>
    </html>
  );
}
