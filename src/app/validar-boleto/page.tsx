"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@mdi/react";
import {
  mdiBus,
  mdiQrcodeScan,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiClockOutline,
  mdiAccount,
  mdiTicketConfirmationOutline,
  mdiRefresh,
  mdiCamera,
  mdiCameraOff,
  mdiClose,
  mdiArrowLeft,
  mdiMapMarker,
  mdiShieldCheckOutline,
} from "@mdi/js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validarBoletoAction, getManifiestoViajeAction, ResultadoValidacionBoleto } from "@/backend/actions/boletos";
import { getCurrentUserAction } from "@/backend/actions/auth";

interface ManifiestoData {
  idViaje: number;
  origen: string;
  destino: string;
  cooperativa: string;
  horaSalida: string;
  estadoViaje: string;
  unidad: string;
  placa: string;
  chofer: string;
  ayudante: string;
  capacidadUnidad: number;
  boletosAbordados: number;
  boletosPagados: number;
  totalBoletos: number;
  boletos: Array<{
    idBoleto: number;
    codigoBoleto: string;
    asientoNumero: string | number;
    monto: number;
    estado: string;
    fechaHora: string;
  }>;
}

export default function ValidarBoletoPage() {
  const router = useRouter();
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [loadingManifiesto, setLoadingManifiesto] = useState(true);
  const [manifiesto, setManifiesto] = useState<ManifiestoData | null>(null);
  const [resultado, setResultado] = useState<ResultadoValidacionBoleto | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [alreadyBoardedNotice, setAlreadyBoardedNotice] = useState(false);
  const [filtroManifiesto, setFiltroManifiesto] = useState<"todos" | "abordados" | "pendientes">("todos");
  const [currentUser, setCurrentUser] = useState<{ nombre: string; rolNombre: string; cooperativaNombre?: string } | null>(null);

  // Estados de escáner con cámara
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCheckingCamera, setIsCheckingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Cargar usuario y viaje
  const loadData = async () => {
    setLoadingManifiesto(true);
    try {
      const [user, maniRes] = await Promise.all([
        getCurrentUserAction(),
        getManifiestoViajeAction(),
      ]);

      if (user) {
        setCurrentUser({
          nombre: user.nombre,
          rolNombre: user.rolNombre,
        });
      }

      if (maniRes.success && maniRes.data) {
        setManifiesto(maniRes.data as ManifiestoData);
      }
    } catch (err) {
      console.error("Error al cargar datos operativos:", err);
    } finally {
      setLoadingManifiesto(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const ejecutarValidacion = async (codigo: string) => {
    if (!codigo.trim()) return;

    setLoadingValidacion(true);
    setFeedbackError(null);
    setResultado(null);
    setAlreadyBoardedNotice(false);

    try {
      const res = await validarBoletoAction(codigo.trim());
      if (res.success && res.data) {
        setResultado(res.data);
        setCodigoInput("");
        loadData();
      } else {
        if (res.alreadyBoarded && res.data) {
          setResultado(res.data);
          setAlreadyBoardedNotice(true);
        } else {
          setFeedbackError(res.error || "No se pudo validar el boleto.");
        }
      }
    } catch {
      setFeedbackError("Error de comunicación al contactar con el servidor.");
    } finally {
      setLoadingValidacion(false);
    }
  };

  const handleValidar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codigoInput.trim()) return;
    await ejecutarValidacion(codigoInput);
  };

  // Verificación y apertura de la cámara del dispositivo
  const checkAndOpenCamera = async () => {
    setFeedbackError(null);
    setIsCheckingCamera(true);

    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setFeedbackError("Este navegador o dispositivo no soporta acceso a la cámara.");
      setIsCheckingCamera(false);
      return;
    }

    try {
      // 1. Verificar si existen dispositivos de videoinput conectados
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length === 0) {
        setFeedbackError("No se detectó ninguna cámara física conectada en este dispositivo.");
        setIsCheckingCamera(false);
        return;
      }

      // 2. Solicitar flujo de video (priorizando cámara trasera en móviles)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });

      setCameraStream(stream);
      setShowCameraModal(true);
    } catch (err: any) {
      console.error("Error al acceder a la cámara:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setFeedbackError("Permiso de cámara denegado. Concede permiso de cámara en los ajustes de tu navegador.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setFeedbackError("No se encontró ninguna cámara disponible en el equipo.");
      } else {
        setFeedbackError("No se pudo iniciar la cámara: " + (err.message || "Error desconocido."));
      }
    } finally {
      setIsCheckingCamera(false);
    }
  };

  const cerrarCamara = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  // Detección automática en video con BarcodeDetector
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});

      let active = true;
      let detector: any = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          detector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "code_128", "code_39"],
          });
        } catch {
          detector = null;
        }
      }

      const interval = setInterval(async () => {
        if (!active || !detector || !videoRef.current) return;
        try {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const detected = await detector.detect(videoRef.current);
            if (detected && detected.length > 0) {
              const code = detected[0].rawValue;
              if (code) {
                active = false;
                cerrarCamara();
                setCodigoInput(code);
                ejecutarValidacion(code);
              }
            }
          }
        } catch {
          // Errores de frame intermedio ignorados
        }
      }, 350);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }
  }, [showCameraModal, cameraStream]);

  // Limpiar stream al desmontar el componente
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const boletosFiltrados = (manifiesto?.boletos || []).filter((b) => {
    if (filtroManifiesto === "abordados") return b.estado === "ABORDADO";
    if (filtroManifiesto === "pendientes") return b.estado !== "ABORDADO";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Operativo Homogéneo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/dashboard");
                }
              }}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Volver a la pantalla anterior"
              aria-label="Volver"
            >
              <Icon path={mdiArrowLeft} size={0.7} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  <Icon path={mdiBus} size={0.65} />
                </span>
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                  Validación de Boletos
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Terminal de abordaje para Ayudante, Chofer, Chequeador y Taquilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loadingManifiesto}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Actualizar datos del viaje"
            >
              <Icon path={mdiRefresh} size={0.7} className={loadingManifiesto ? "animate-spin text-slate-900" : ""} />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-none">{currentUser?.nombre || "Operario"}</p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase mt-0.5">
                {currentUser?.rolNombre || "TRIPULACIÓN"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        {/* RESUMEN DEL VIAJE EN CURSO */}
        {loadingManifiesto ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="h-5 w-48 bg-slate-200 animate-pulse rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : manifiesto ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-900 text-white">
                  Unidad #{manifiesto.unidad}
                </span>
                <span className="text-xs text-slate-500 font-medium">Placa: {manifiesto.placa}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-700">{manifiesto.cooperativa}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <Icon path={mdiClockOutline} size={0.6} className="text-slate-500" />
                <span>Salida: <strong className="text-slate-900">{manifiesto.horaSalida}</strong></span>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-slate-900">
                <Icon path={mdiMapMarker} size={0.75} className="text-slate-600 shrink-0" />
                <span>{manifiesto.origen}</span>
                <span className="text-slate-400">→</span>
                <span>{manifiesto.destino}</span>
              </div>

              {/* Indicador de Abordaje */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 font-medium">Pasajeros Abordados</p>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                    {manifiesto.boletosAbordados} <span className="text-xs text-slate-400 font-normal">/ {manifiesto.totalBoletos}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800">
                  {manifiesto.totalBoletos > 0 ? `${Math.round((manifiesto.boletosAbordados / manifiesto.totalBoletos) * 100)}%` : "0%"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
            <Icon path={mdiBus} size={1} className="mx-auto text-slate-400 mb-1.5" />
            <p className="font-semibold text-xs sm:text-sm text-slate-800">No hay viajes programados activos en este momento</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Puedes validar cualquier boleto emitido ingresando el código a continuación.
            </p>
          </div>
        )}

        {/* VALIDADOR DE BOLETO */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Icon path={mdiQrcodeScan} size={0.75} className="text-slate-800" />
              Validar Código de Boleto
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escanea el código QR del boleto impreso o digita el número del boleto (Ej: 1, 10 o BOLETO-12)
            </p>
          </div>

          <form onSubmit={handleValidar} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon path={mdiTicketConfirmationOutline} size={0.7} />
              </div>
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Ingresa código o escanea QR (Ej: BOLETO-14)..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg py-2.5 pl-9 pr-3.5 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 focus:bg-white transition-all uppercase"
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={checkAndOpenCamera}
              disabled={isCheckingCamera}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Abrir cámara del dispositivo para escanear código QR"
            >
              {isCheckingCamera ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
              ) : (
                <Icon path={mdiCamera} size={0.7} className="text-slate-700" />
              )}
              <span>{isCheckingCamera ? "Verificando..." : "Escanear con Cámara"}</span>
            </button>

            <button
              type="submit"
              disabled={loadingValidacion || !codigoInput.trim()}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingValidacion ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon path={mdiShieldCheckOutline} size={0.7} />
              )}
              <span>Validar y Abordar</span>
            </button>
          </form>

          {/* MENSAJES DE ERROR */}
          {feedbackError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <Icon path={mdiAlertCircleOutline} size={0.75} className="text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{feedbackError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackError(null)}
                className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.6} />
              </button>
            </div>
          )}

          {/* RESULTADO DE LA VALIDACIÓN */}
          {resultado && (
            <div
              className={`mt-4 p-4 rounded-xl border transition-all ${
                alreadyBoardedNotice
                  ? "bg-amber-50/70 border-amber-200 text-amber-950"
                  : "bg-emerald-50/60 border-emerald-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      alreadyBoardedNotice ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Icon path={alreadyBoardedNotice ? mdiAlertCircleOutline : mdiCheckCircleOutline} size={0.75} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm leading-tight">
                      {alreadyBoardedNotice ? "Boleto Ya Abordado Anteriormente" : "Boleto Validado y Abordado Correctamente"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {resultado.codigoBoleto} • {resultado.cooperativaNombre}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                    alreadyBoardedNotice
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {alreadyBoardedNotice ? "YA ABORDADO" : "ABORDADO AHORA"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Asiento Asignado</span>
                  <span className="font-bold text-sm text-slate-900">#{resultado.asientoNumero}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Ruta</span>
                  <span className="font-semibold text-xs text-slate-900 truncate block">{resultado.origen} → {resultado.destino}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Unidad de Viaje</span>
                  <span className="font-semibold text-xs text-slate-900">Unidad #{resultado.unidadNumero}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Hora Programada</span>
                  <span className="font-semibold text-xs text-slate-900">{resultado.horaSalida}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MANIFIESTO DE PASAJEROS DEL VIAJE */}
        {manifiesto && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Manifiesto de Pasajeros ({manifiesto.totalBoletos})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control en tiempo real de abordaje en la unidad #{manifiesto.unidad}
                </p>
              </div>

              {/* Filtro de Pestañas */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFiltroManifiesto("todos")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    filtroManifiesto === "todos" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos ({manifiesto.totalBoletos})
                </button>
                <button
                  onClick={() => setFiltroManifiesto("abordados")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    filtroManifiesto === "abordados" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Abordados ({manifiesto.boletosAbordados})
                </button>
                <button
                  onClick={() => setFiltroManifiesto("pendientes")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    filtroManifiesto === "pendientes" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pendientes ({manifiesto.totalBoletos - manifiesto.boletosAbordados})
                </button>
              </div>
            </div>

            {boletosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No hay boletos en este filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Asiento</th>
                      <th className="py-3 px-4">Código Boleto</th>
                      <th className="py-3 px-4">Monto</th>
                      <th className="py-3 px-4">Estado Abordaje</th>
                      <th className="py-3 px-4 text-right">Acción Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boletosFiltrados.map((b) => {
                      const isAbordado = b.estado === "ABORDADO";
                      return (
                        <tr key={b.idBoleto} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-black text-slate-900 text-sm">
                            #{b.asientoNumero}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {b.codigoBoleto}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            C$ {b.monto.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                isAbordado
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAbordado ? "bg-emerald-600" : "bg-amber-600"}`} />
                              {isAbordado ? "Abordado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isAbordado && (
                              <button
                                onClick={() => {
                                  setCodigoInput(b.codigoBoleto);
                                  validarBoletoAction(b.idBoleto).then((res) => {
                                    if (res.success && res.data) {
                                      setResultado(res.data);
                                      setCodigoInput("");
                                      loadData();
                                    }
                                  });
                                }}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-[11px] transition-colors cursor-pointer"
                              >
                                Abordar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL ESCÁNER DE CÁMARA */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl text-white">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                  <Icon path={mdiCamera} size={0.7} />
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">Escanear Boleto con Cámara</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Apunta hacia el código QR impreso o digital</p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarCamara}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cerrar cámara"
              >
                <Icon path={mdiClose} size={0.7} />
              </button>
            </div>

            {/* Video Viewport with Scan Reticle */}
            <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-56 h-56 sm:w-60 sm:h-60 border border-white/40 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Reticle corner marks */}
                  <span className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-sm" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-sm" />
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-sm" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-sm" />
                </div>
                <p className="text-xs text-white/90 bg-black/75 px-3 py-1 rounded-md mt-4 backdrop-blur-xs font-medium">
                  Alinea el código QR dentro del recuadro
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px]">
                Validación y detección automática
              </span>
              <button
                type="button"
                onClick={cerrarCamara}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
