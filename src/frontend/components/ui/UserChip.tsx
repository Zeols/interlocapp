"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiChevronDown, mdiAccountOutline, mdiCogOutline, mdiLogout, mdiTicketConfirmationOutline } from "@mdi/js";
import { motion, AnimatePresence } from "framer-motion";
import { logoutAction } from "@/backend/actions/auth";

export function UserChip({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const displayChar = (name || email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    const res = await logoutAction();
    router.push(res.data?.redirectUrl || "/login");
    router.refresh();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        className={`flex items-center gap-2.5 sm:gap-3 bg-transparent border-none cursor-pointer p-1.5 sm:p-2 rounded-full transition-colors duration-200 ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="text-right hidden sm:block">
          {name && <p className="text-sm font-bold text-gray-900 leading-tight">{name}</p>}
          <p className="text-xs text-gray-500">{email}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
          <span className="text-sm font-extrabold text-primary">{displayChar}</span>
        </div>
        <Icon 
          path={mdiChevronDown} 
          size={0.75} 
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
            className="absolute top-[calc(100%+0.5rem)] right-0 w-60 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 z-[100] origin-top-right"
          >
            <div className="px-3.5 py-2.5">
              <p className="font-extrabold text-gray-900 text-sm tracking-tight">{name}</p>
              <p className="text-gray-500 text-xs mt-0.5 truncate">{email}</p>
            </div>
            <div className="h-px bg-gray-100 my-1.5" />
            <Link 
              href="/tickets"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon path={mdiTicketConfirmationOutline} size={0.7} className="text-primary" />
              Mis Boletos
            </Link>
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
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none rounded-xl cursor-pointer text-xs sm:text-sm font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Icon path={mdiLogout} size={0.7} className="text-red-400" />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
