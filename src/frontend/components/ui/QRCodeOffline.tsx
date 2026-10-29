"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeOfflineProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Componente de código QR autónomo y 100% offline.
 * No realiza peticiones a APIs externas ni depende de conexión a internet en ruta.
 */
export function QRCodeOffline({
  value,
  size = 160,
  className = "",
  alt = "Código QR",
  errorCorrectionLevel = "M",
}: QRCodeOfflineProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function generateQR() {
      try {
        setError(false);
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          color: {
            dark: "#0f172a", // slate-900 sobrio
            light: "#ffffff",
          },
          errorCorrectionLevel,
        });

        if (isMounted) {
          setDataUrl(url);
        }
      } catch (err) {
        console.error("Error al generar código QR local:", err);
        if (isMounted) setError(true);
      }
    }

    if (value) {
      generateQR();
    }

    return () => {
      isMounted = false;
    };
  }, [value, size, errorCorrectionLevel]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-[11px] text-center p-2 border border-slate-200 ${className}`}
      >
        QR no disponible
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-50 animate-pulse rounded-lg flex items-center justify-center border border-slate-200 ${className}`}
      >
        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg object-contain bg-white shadow-2xs ${className}`}
      loading="eager"
    />
  );
}

/**
 * Helper para generar el payload estructurado del boleto para validación rápida en terminal o ruta.
 */
export function encodeBoletoQRPayload(boleto: {
  idBoleto: number;
  idViaje?: number;
  asiento?: string | number;
  codigoBoleto?: string;
}): string {
  // Payload JSON compacto con identificadores clave
  return JSON.stringify({
    b: boleto.idBoleto,
    v: boleto.idViaje || null,
    a: boleto.asiento || null,
    c: boleto.codigoBoleto || `BOLETO-${boleto.idBoleto}`,
    t: Date.now(),
  });
}

