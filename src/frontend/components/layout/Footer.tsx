import React from "react";
import Link from "next/link";
import { Logo } from "@/frontend/components/ui/Logo";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`bg-white border-t border-gray-100 py-6 ${className}`}>
      <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer" title="Ir al inicio">
          <Logo size={0.8} />
          <div className="flex flex-col text-left">
            <span className="font-bold text-gray-900 text-base tracking-tight leading-none group-hover:text-primary transition-colors">
              InterlocApp
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">
              Transporte Interurbano
            </span>
          </div>
        </Link>

        <p className="text-xs text-gray-400">
          © 2026 InterlocApp. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
