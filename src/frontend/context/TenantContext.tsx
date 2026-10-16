"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { getCooperativasActivasAction } from "@/backend/actions/cooperativas";

export interface CooperativaTenant {
  idCooperativa: number;
  nombre: string;
}

interface TenantContextType {
  selectedCoopId: string; // "ALL" o ID de la cooperativa en string
  setSelectedCoopId: (id: string) => void;
  selectedCoop: CooperativaTenant | null;
  cooperativas: CooperativaTenant[];
  isSuperAdmin: boolean;
  userCoopId: number | null;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  selectedCoopId: "ALL",
  setSelectedCoopId: () => {},
  selectedCoop: null,
  cooperativas: [],
  isSuperAdmin: false,
  userCoopId: null,
  loading: true,
});

const STORAGE_KEY = "interlocapp_selected_tenant_coop";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [selectedCoopId, setSelectedCoopIdState] = useState<string>("ALL");
  const [cooperativas, setCooperativas] = useState<CooperativaTenant[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userCoopId, setUserCoopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar sesión y catálogo de cooperativas
  useEffect(() => {
    async function initTenant() {
      try {
        const user = await getCurrentUserAction();
        if (user) {
          const superAdmin = user.rolNombre === "SUPER_ADMIN";
          setIsSuperAdmin(superAdmin);
          setUserCoopId(user.idCooperativa || null);

          if (superAdmin) {
            const coopsRes = await getCooperativasActivasAction();
            if (coopsRes.success && coopsRes.data) {
              const activeCoops = coopsRes.data as CooperativaTenant[];
              setCooperativas(activeCoops);

              // Recuperar selección guardada de localStorage si existe
              if (typeof window !== "undefined") {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved && (saved === "ALL" || activeCoops.some((c) => c.idCooperativa.toString() === saved))) {
                  setSelectedCoopIdState(saved);
                }
              }
            }
          } else if (user.idCooperativa) {
            // Si es ADMIN_COOP u otro rol, forzar el tenant a su cooperativa
            setSelectedCoopIdState(user.idCooperativa.toString());
          }
        }
      } catch (err) {
        console.error("Error al inicializar TenantContext:", err);
      } finally {
        setLoading(false);
      }
    }
    initTenant();
  }, []);

  const setSelectedCoopId = (id: string) => {
    setSelectedCoopIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const selectedCoop =
    selectedCoopId === "ALL"
      ? null
      : cooperativas.find((c) => c.idCooperativa.toString() === selectedCoopId) || null;

  return (
    <TenantContext.Provider
      value={{
        selectedCoopId,
        setSelectedCoopId,
        selectedCoop,
        cooperativas,
        isSuperAdmin,
        userCoopId,
        loading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  return context;
}
