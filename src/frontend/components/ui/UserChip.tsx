"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiChevronDown, mdiAccountOutline, mdiCogOutline, mdiLogout, mdiTicketConfirmationOutline, mdiBus } from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { logoutAction } from "@/backend/actions/auth";
import { LogoutModal } from "@/frontend/components/ui/LogoutModal";

export function UserChip({
  name,
  email,
  avatarUrl,
  isCoopUser,
  rolNombre,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isCoopUser?: boolean;
  rolNombre?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const displayChar = (name?.trim() || email?.trim() || "?").charAt(0).toUpperCase();
  const hasValidPhoto = Boolean(avatarUrl && avatarUrl.trim() !== "" && !imgFailed);
  const isOperativeBusRole = ['CHOFER', 'AYUDANTE', 'TAQUILLERO'].includes(rolNombre || '');

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenLogout = () => {
    setIsOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    const res = await logoutAction();
    router.push(res.data?.redirectUrl || "/login");
    router.refresh(); 
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        className={`flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-1 rounded-full transition-colors duration-200 ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        title={name || "Perfil de usuario"}
      >
        <div className="relative">
          {hasValidPhoto ? (
            <img
              key={avatarUrl!}
              src={avatarUrl!}
              alt={name || "Usuario"}
              onError={() => setImgFailed(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-primary/20 shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <span className="text-xs sm:text-sm font-extrabold text-primary select-none">{displayChar}</span>
            </div>
          )}
          {isOperativeBusRole && (
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white border border-white flex items-center justify-center shadow-xs"
              title={`Rol operativo: ${rolNombre}`}
            >
              <Icon path={mdiBus} size={0.35} />
            </span>
          )}
        </div>
        <Icon 
          path={mdiChevronDown} 
          size={0.65} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+0.5rem)] right-0 w-64 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 z-[100] origin-top-right"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="relative shrink-0">
                {hasValidPhoto ? (
                  <img
                    key={avatarUrl!}
                    src={avatarUrl!}
                    alt={name || "Usuario"}
                    className="w-10 h-10 rounded-full object-cover border border-primary/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black text-sm shrink-0">
                    {displayChar}
                  </div>
                )}
                {isOperativeBusRole && (
                  <span
                    className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-900 text-white border border-white flex items-center justify-center shadow-xs"
                    title={`Rol: ${rolNombre}`}
                  >
                    <Icon path={mdiBus} size={0.4} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-gray-900 text-sm tracking-tight truncate">{name}</p>
                  {isOperativeBusRole && (
                    <span className="p-0.5 rounded bg-slate-100 text-slate-700 shrink-0" title={`Rol operativo: ${rolNombre}`}>
                      <Icon path={mdiBus} size={0.55} />
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs truncate">{email}</p>
              </div>
            </div>
            <div className="h-px bg-gray-100 my-1.5" />
            {isCoopUser ? (
              <Link 
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <Icon path={mdiBus} size={0.7} className="text-primary" />
                {(() => {
                  // Normalizamos el rol a mayúsculas y eliminamos espacios para evitar fallos
                  const rolLimpio = (rolNombre || "").trim().toUpperCase();
                  
                  if (rolLimpio === "AYUDANTE") return "Panel de Ayudante";
                  if (rolLimpio === "CHOFER") return "Panel de Chofer";
                  if (rolLimpio === "TAQUILLERO") return "Panel de Taquillero";
                  return "Panel de Cooperativa";
                })()}
              </Link>
            ) : (
              <Link 
                href="/tickets"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <Icon path={mdiTicketConfirmationOutline} size={0.7} className="text-primary" />
                Mis Boletos
              </Link>
            )}
            <Link 
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon path={mdiAccountOutline} size={0.7} className="text-gray-400" />
              Ver perfil
            </Link>
            <Link 
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon path={mdiCogOutline} size={0.7} className="text-gray-400" />
              Ajustes
            </Link>
            <div className="h-px bg-gray-100 my-1.5" />
            <button 
              onClick={handleOpenLogout}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Icon path={mdiLogout} size={0.7} className="text-red-400" />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación para cerrar sesión */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={name}
      />
    </div>
  );
}
