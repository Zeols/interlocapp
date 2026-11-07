"use client";

import React, { useState, useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiAlertOctagonOutline,
  mdiPlusCircleOutline,
  mdiLoading,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiBusAlert,
  mdiCheck,
  mdiAccountGroup,
  mdiInformationOutline,
  mdiAccountTie,
} from "@mdi/js";
import { getCurrentUserAction } from "@/backend/actions/auth";
import { getViajeActivoAyudanteAction } from "@/backend/actions/viajes";
import { 
  registrarEmergenciaAyudanteAction, 
  getEmergenciasViajeAction, 
  getDatosGestionEmergenciaAction,
  autorizarDespachoExtraordinarioAction
} from "@/backend/actions/emergencias";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { useTenant } from "@/frontend/context/TenantContext";

export default function EmergenciasPage() {
  const { selectedCoopId, selectedCoop } = useTenant();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  
  // Estados Ayudante
  const [viajeActivo, setViajeActivo] = useState<any>(null);
  const [incidentesAyudante, setIncidentesAyudante] = useState<any[]>([]);
  const [showModalReporte, setShowModalReporte] = useState(false);
  const [tipo, setTipo] = useState<"AVERIA_MECANICA" | "ACCIDENTE" | "RETRASO" | "OTRO">("AVERIA_MECANICA");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Estados Chequeador / Taquillero
  const [incidentesCheq, setIncidentesCheq] = useState<any[]>([]);
  const [unidadesDisp, setUnidadesDisp] = useState<any[]>([]);
  const [choferesDisp, setChoferesDisp] = useState<any[]>([]);
  const [ayudantesDisp, setAyudantesDisp] = useState<any[]>([]);
  const [selectedIncidente, setSelectedIncidente] = useState<any>(null);
  const [selectedUnidadesIds, setSelectedUnidadesIds] = useState<number[]>([]);
  
  // Estados de Personal para el despacho extraordinario
  const [choferesPorUnidad, setChoferesPorUnidad] = useState<{ [idUnidad: number]: number }>({});
  const [mantenerAyudanteOriginal, setMantenerAyudanteOriginal] = useState(true);
  const [ayudantesAdicionales, setAyudantesAdicionales] = useState<{ [index: number]: number }>({});

  const [showModalGestion, setShowModalGestion] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUserAction();
      if (!user) return;
      setSession(user);

      const rol = (user.rolNombre || "").trim().toUpperCase();

      if (rol === "AYUDANTE" || rol === "CHOFER") {
        const resViaje = await getViajeActivoAyudanteAction(user.idUsuario);
        if (resViaje.success && resViaje.data) {
          setViajeActivo(resViaje.data);
          const resInc = await getEmergenciasViajeAction(resViaje.data.idViaje);
          if (resInc.success && resInc.data) {
            setIncidentesAyudante(resInc.data);
          }
        }
      } else {
        const coopNum = selectedCoopId === "ALL" ? undefined : Number(selectedCoopId);
        const resData = await getDatosGestionEmergenciaAction(coopNum);
        if (resData.success && resData.data) {
          setIncidentesCheq(resData.data.incidentes);
          setUnidadesDisp(resData.data.unidadesDisponibles);
          setChoferesDisp(resData.data.choferes);
          setAyudantesDisp(resData.data.ayudantes);
        }
      }
    } catch (err) {
      console.error("Error al cargar emergencias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [selectedCoopId]);

  const handleEnviarEmergencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viajeActivo?.idViaje) return;
    setEnviando(true);
    setFeedback(null);

    const res = await registrarEmergenciaAyudanteAction({
      idViaje: viajeActivo.idViaje,
      tipo,
      descripcion,
    });

    setEnviando(false);
    if (res.success) {
      setFeedback({ type: "success", text: "Alerta de emergencia enviada al puesto de control." });
      setShowModalReporte(false);
      setDescripcion("");
      await cargarDatos();
    } else {
      setFeedback({ type: "error", text: res.error || "Error al enviar." });
    }
  };

  const handleAutorizarDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidente) return;

    // Mapear los choferes seleccionados en orden de unidades
    const idsChoferes = selectedUnidadesIds.map(idUnidad => choferesPorUnidad[idUnidad]);
    const idsAyudantesAdicionalesArr = Object.values(ayudantesAdicionales);

    setProcesando(true);
    setFeedback(null);

    const res = await autorizarDespachoExtraordinarioAction({
      idIncidente: selectedIncidente.idIncidente,
      idsUnidadesRepuesto: selectedUnidadesIds,
      idsChoferes,
      mantenerAyudanteOriginal,
      idsAyudantesAdicionales: idsAyudantesAdicionalesArr,
    });

    setProcesando(false);
    if (res.success) {
      setFeedback({ type: "success", text: res.message || "Despacho autorizado con exito." });
      setShowModalGestion(false);
      setSelectedIncidente(null);
      setSelectedUnidadesIds([]);
      setChoferesPorUnidad({});
      setAyudantesAdicionales({});
      await cargarDatos();
    } else {
      setFeedback({ type: "error", text: res.error || "No se pudo autorizar." });
    }
  };

  // Calculos de aforo
  const pasajerosVaradosCount = selectedIncidente?.despacho?.viaje?.boletos?.length || 0;
  const capacidadSeleccionada = unidadesDisp
    .filter(u => selectedUnidadesIds.includes(u.idUnidad))
    .reduce((acc, u) => acc + (u.asientos?.length || 0), 0);
  
  const aforoInsuficiente = capacidadSeleccionada < pasajerosVaradosCount;
  const faltaAsignarChoferes = selectedUnidadesIds.some(id => !choferesPorUnidad[id]);

  const rolUsuario = (session?.rolNombre || "").trim().toUpperCase();
  const isAyudante = rolUsuario === "AYUDANTE" || rolUsuario === "CHOFER";

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAyudante ? "Mis Emergencias en Ruta" : `Atender Emergencias ${selectedCoop ? `(${selectedCoop.nombre})` : ""}`}
        description={
          isAyudante
            ? "Reporta incidentes mecanicos o accidentes y verifica el estado de atencion."
            : "Supervisa las alertas de los ayudantes, evalua aforos y autoriza unidades de repuesto."
        }
      >
        {isAyudante && (
          <button
            onClick={() => setShowModalReporte(true)}
            disabled={!viajeActivo}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Icon path={mdiPlusCircleOutline} size={0.7} />
            <span>Reportar Emergencia</span>
          </button>
        )}
      </PageHeader>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs ${
          feedback.type === "success" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-rose-50 text-rose-900 border-rose-200"
        }`}>
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Icon path={mdiLoading} size={0.8} className="animate-spin" />
          <span>Cargando datos...</span>
        </div>
      ) : isAyudante ? (
        !viajeActivo ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2 shadow-2xs">
            <Icon path={mdiAlertOctagonOutline} size={1.2} className="mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">Sin Viaje Activo</h3>
            <p className="text-xs text-slate-500">Necesitas estar asignado a un viaje en curso.</p>
          </div>
        ) : incidentesAyudante.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2 shadow-2xs">
            <Icon path={mdiCheckCircleOutline} size={1.2} className="mx-auto text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Sin Incidentes</h3>
            <p className="text-xs text-slate-500">Tu viaje transcurre con normalidad.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidentesAyudante.map((inc) => (
              <div key={inc.idIncidente} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      <Icon path={mdiAlertOctagonOutline} size={0.7} />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase">{inc.tipo.replace("_", " ")}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Reportado: {new Date(inc.fechaHora).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                    inc.estado === "REGISTRADO" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}>
                    <Icon path={inc.estado === "REGISTRADO" ? mdiClockOutline : mdiCheckCircleOutline} size={0.6} />
                    <span>{inc.estado === "REGISTRADO" ? "Enviado / Esperando Chequeador" : "Atendido / Resuelto"}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{inc.descripcion}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        incidentesCheq.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2 shadow-2xs">
            <Icon path={mdiCheckCircleOutline} size={1.2} className="mx-auto text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">No Hay Solicitudes Pendientes</h3>
            <p className="text-xs text-slate-500">Las alertas de los ayudantes en ruta apareceran aqui en tiempo real.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidentesCheq.map((inc) => {
              const viaje = inc.despacho?.viaje;
              const unidadOriginal = inc.despacho?.asignacionUnidad?.unidad;
              const ayudanteOriginal = inc.despacho?.asignacionUnidad?.usuario;
              const pasajerosVarados = viaje?.boletos?.length || 0;

              return (
                <div key={inc.idIncidente} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        <Icon path={mdiBusAlert} size={0.8} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 uppercase">{inc.tipo.replace("_", " ")}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            {inc.estado}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Ruta: <strong className="text-slate-800">{viaje?.ruta?.nombre || "N/A"}</strong> · Unidad Afectada: <strong className="text-slate-800">#{unidadOriginal?.numeroUnidad || "N/A"}</strong> ({unidadOriginal?.placa})
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(inc.fechaHora).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block font-medium">Motivo / Descripcion:</span>
                      <p className="text-slate-900 font-semibold mt-0.5">{inc.descripcion}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-medium">Ayudante original:</span>
                      <p className="text-slate-900 font-semibold mt-0.5">
                        {ayudanteOriginal ? `${ayudanteOriginal.nombre} ${ayudanteOriginal.apellido}` : "No asignado"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-medium">Pasajeros Varados (Aforo):</span>
                      <p className="text-rose-600 font-bold mt-0.5">{pasajerosVarados} pasajeros con boleto activo</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIncidente(inc);
                        setSelectedUnidadesIds([]);
                        setChoferesPorUnidad({});
                        setMantenerAyudanteOriginal(true);
                        setAyudantesAdicionales({});
                        setShowModalGestion(true);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Icon path={mdiCheck} size={0.65} />
                      <span>Gestionar Despacho de Emergencia</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODAL DE GESTION DE DESPACHO EXTRAORDINARIO */}
      {showModalGestion && selectedIncidente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Autorizar Despacho de Emergencia</h3>
                <p className="text-xs text-slate-500">Seleccione las unidades de repuesto, sus choferes y valide el aforo.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModalGestion(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAutorizarDespacho} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Pasajeros varados a trasladar:</span>
                  <strong className="text-rose-700 text-sm">{pasajerosVaradosCount}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-amber-200/60 pt-1.5">
                  <span>Capacidad de unidades seleccionadas:</span>
                  <strong className={aforoInsuficiente ? "text-rose-600" : "text-emerald-700"}>
                    {capacidadSeleccionada} asientos
                  </strong>
                </div>
                {aforoInsuficiente && (
                  <p className="text-[11px] text-rose-600 font-semibold pt-1 flex items-center gap-1">
                    <Icon path={mdiInformationOutline} size={0.55} />
                    <span>La capacidad seleccionada es menor al aforo de pasajeros varados. Seleccione mas unidades.</span>
                  </p>
                )}
              </div>

              {/* SELECCION DE UNIDADES */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Unidades de Repuesto Disponibles:</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {unidadesDisp.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No hay unidades disponibles en este momento.</p>
                  ) : (
                    unidadesDisp.map((u) => {
                      const isSelected = selectedUnidadesIds.includes(u.idUnidad);
                      return (
                        <label
                          key={u.idUnidad}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUnidadesIds([...selectedUnidadesIds, u.idUnidad]);
                                } else {
                                  setSelectedUnidadesIds(selectedUnidadesIds.filter(id => id !== u.idUnidad));
                                  // Limpiar chofer asignado si se desmarca
                                  const updated = { ...choferesPorUnidad };
                                  delete updated[u.idUnidad];
                                  setChoferesPorUnidad(updated);
                                }
                              }}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="font-bold">Unidad #{u.numeroUnidad} ({u.placa}) - {u.tipoUnidad?.nombre}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
                            {u.asientos?.length || 0} asientos
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ASIGNACION DE CHOFERES POR CADA UNIDAD SELECCIONADA */}
              {selectedUnidadesIds.length > 0 && (
                <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <label className="font-semibold text-slate-700 block flex items-center gap-1">
                    <Icon path={mdiAccountTie} size={0.6} />
                    <span>Asignar Choferes para las Unidades de Repuesto:</span>
                  </label>
                  {selectedUnidadesIds.map((idUnidad, idx) => {
                    const unidadObj = unidadesDisp.find(u => u.idUnidad === idUnidad);
                    return (
                      <div key={idUnidad} className="space-y-1 pt-1">
                        <span className="text-[11px] font-bold text-slate-600">Chofer para Unidad #{unidadObj?.numeroUnidad || (idx + 1)}:</span>
                        <select
                          value={choferesPorUnidad[idUnidad] || ""}
                          onChange={(e) => setChoferesPorUnidad({ ...choferesPorUnidad, [idUnidad]: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:outline-none"
                          required
                        >
                          <option value="">Seleccione un chofer...</option>
                          {choferesDisp.map((ch) => (
                            <option key={ch.idUsuario} value={ch.idUsuario}>
                              {ch.nombre} {ch.apellido}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* GESTION DEL AYUDANTE */}
              {selectedUnidadesIds.length > 0 && (
                <div className="space-y-3 bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-900">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mantenerAyudanteOriginal}
                        onChange={(e) => setMantenerAyudanteOriginal(e.target.checked)}
                        className="rounded border-blue-300 text-primary focus:ring-primary"
                      />
                      <span>Mantener ayudante original en la 1ra unidad de repuesto</span>
                    </label>
                  </div>

                  {/* Si se seleccionan 2 unidades o el ayudante original no continua */}
                  {(selectedUnidadesIds.length > 1 || !mantenerAyudanteOriginal) && (
                    <div className="space-y-2 pt-2 border-t border-blue-200/60">
                      <span className="font-semibold block text-xs">Asignar ayudantes adicionales necesarios:</span>
                      {selectedUnidadesIds.map((_, idx) => {
                        // Si la 1ra unidad no mantiene al original, necesita ayudante. La 2da unidad siempre necesita ayudante extra.
                        if (idx === 0 && mantenerAyudanteOriginal) return null;

                        const ayudanteIndexKey = idx === 0 ? 0 : idx - 1;
                        return (
                          <div key={idx} className="space-y-1">
                            <span className="text-[11px] font-bold">Ayudante para Unidad de Repuesto #{idx + 1}:</span>
                            <select
                              value={ayudantesAdicionales[ayudanteIndexKey] || ""}
                              onChange={(e) => setAyudantesAdicionales({ ...ayudantesAdicionales, [ayudanteIndexKey]: Number(e.target.value) })}
                              className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:outline-none"
                              required
                            >
                              <option value="">Seleccione un ayudante...</option>
                              {ayudantesDisp
                                .filter(ay => ay.idUsuario !== selectedIncidente?.despacho?.asignacionUnidad?.idUsuario)
                                .map((ay) => (
                                  <option key={ay.idUsuario} value={ay.idUsuario}>
                                    {ay.nombre} {ay.apellido}
                                  </option>
                                ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalGestion(false)}
                  disabled={procesando}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando || selectedUnidadesIds.length === 0 || aforoInsuficiente || faltaAsignarChoferes}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {procesando && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                  <span>{procesando ? "Autorizando..." : "Autorizar Despacho Extraordinario"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalReporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Enviar Solicitud de Emergencia</h3>
              <button
                type="button"
                onClick={() => setShowModalReporte(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnviarEmergencia} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Tipo de Incidente:</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="AVERIA_MECANICA">Averia Mecanica</option>
                  <option value="ACCIDENTE">Accidente</option>
                  <option value="RETRASO">Retraso Severo</option>
                  <option value="OTRO">Otro Incidente</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descripcion detallada:</label>
                <textarea
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Explique brevemente lo sucedido..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalReporte(false)}
                  disabled={enviando}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {enviando && <Icon path={mdiLoading} size={0.6} className="animate-spin" />}
                  <span>{enviando ? "Enviando..." : "Enviar a Chequeador"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}