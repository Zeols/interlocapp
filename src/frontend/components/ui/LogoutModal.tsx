"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@mdi/react";
import { mdiLogout, mdiLoading } from "@mdi/js";

export interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  userName?: string;
}

export function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
}: LogoutModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Prevenir scroll en el fondo cuando el modal esté abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 select-none">
          {/* Backdrop con desenfoque suave a pantalla completa */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isLoading && onClose()}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs"
          />

          {/* Tarjeta del Modal perfectamente centrada en el viewport */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm bg-white rounded-xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-center overflow-hidden z-10 mx-auto"
          >
            {/* Ícono de Alerta / Cerrar Sesión */}
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <Icon path={mdiLogout} size={1} />
            </div>

            {/* Título y Mensaje */}
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
              ¿Cerrar sesión?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
              {userName ? (
                <>
                  Hola <strong className="text-slate-700">{userName}</strong>, tu sesión actual se cerrará y necesitarás ingresar tus credenciales para volver a acceder.
                </>
              ) : (
                "Tu sesión actual se cerrará y necesitarás ingresar tus credenciales para volver a acceder."
              )}
            </p>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Icon path={mdiLoading} size={0.7} className="animate-spin text-white" />
                    <span>Saliendo...</span>
                  </>
                ) : (
                  <span>Sí, salir</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
export default LogoutModal;
