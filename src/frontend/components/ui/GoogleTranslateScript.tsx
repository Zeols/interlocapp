"use client";

import React, { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

/**
 * Función utilitaria global para cambiar el idioma de la aplicación mediante Google Translate
 */
export function changeAppLanguage(langCode: string) {
  if (typeof window === "undefined") return;

  const hostname = window.location.hostname;
  const cookieValue = `/es/${langCode}`;

  // Si se selecciona español (idioma original del sistema), se eliminan las cookies de traducción
  if (langCode === "es") {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
  } else {
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${hostname};`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=.${hostname};`;
  }

  // Intentar cambiar directamente el combo interno de Google Translate si está disponible
  try {
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
      return;
    }
  } catch (err) {
    console.warn("No se pudo interactuar directamente con el selector de Google Translate:", err);
  }

  // Si no se encuentra el combo activo, recargar para que tome la cookie
  window.location.reload();
}

/**
 * Componente que inicializa el widget de Google Translate y oculta las barras molestas por defecto
 */
export function GoogleTranslateScript() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "es",
            includedLanguages: "es,en,fr,de,it,pt",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE,
          },
          "google_translate_element"
        );
      }
    };
  }, []);

  return (
    <>
      {/* Contenedor invisible para el motor de traducción de Google */}
      <div id="google_translate_element" className="hidden" aria-hidden="true" />

      {/* Script oficial de Google Translate */}
      <Script
        id="google-translate-script"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      {/* Estilos para limpiar la barra flotante invasiva de Google Translate */}
      <style jsx global>{`
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        #goog-gt-tt,
        .goog-te-balloon-frame {
          display: none !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}
