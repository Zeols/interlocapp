"use client";

import React, { useState, useEffect } from "react";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { getViajeActivoAyudanteAction, getDatosOperacionAyudanteAction } from "@/backend/actions/viajes";
import { AyudanteOperationalPanel } from "@/frontend/components/dashboard/AyudanteOperationalPanel";

export default function AyudantePage() {
  const [session, setSession] = useState<any>(null);
  const [viajeActivo, setViajeActivo] = useState<any>(null);
  const [operacionAyudante, setOperacionAyudante] = useState<any>(null);
  const [paradaActualIndex, setParadaActualIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUserAction();
      if (user) {
        setSession(user);
        const resViaje = await getViajeActivoAyudanteAction(user.idUsuario);
        if (resViaje.success && resViaje.data) {
          setViajeActivo(resViaje.data);
          const index = resViaje.data.paradas.findIndex((p: any) => p.id === resViaje.data.paradaActualId);
          setParadaActualIndex(index >= 0 ? index : 0);

          const resOp = await getDatosOperacionAyudanteAction(resViaje.data.idViaje);
          if (resOp.success && resOp.data) {
            setOperacionAyudante(resOp.data);
          }
        } else {
          setViajeActivo(null);
          setOperacionAyudante(null);
        }
      }
    } catch (err) {
      console.error("Error al cargar datos en /dashboard/ayudante:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AyudanteOperationalPanel
      viajeActivo={viajeActivo}
      operacionAyudante={operacionAyudante}
      paradaActualIndex={paradaActualIndex}
      session={session}
      onRefresh={loadData}
      loading={loading}
    />
  );
}

