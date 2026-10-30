"use server";

import webpush from "web-push";
import { prisma } from "../db";
import { getSession } from "../lib/session";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:soporte@interlocapp.com";

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.error("Error al configurar VAPID details en web-push:", err);
  }
}

export async function getVapidPublicKeyAction(): Promise<{ success: boolean; publicKey?: string; error?: string }> {
  if (!publicKey) {
    return { success: false, error: "Claves VAPID no configuradas en el servidor." };
  }
  return { success: true, publicKey };
}

export interface GuardarSuscripcionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export async function guardarSuscripcionPushAction(
  data: GuardarSuscripcionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const idUsuario = session?.idUsuario || null;

    if (!data.endpoint || !data.p256dh || !data.auth) {
      return { success: false, error: "Datos de suscripción incompletos." };
    }

    await prisma.pushSuscripcion.upsert({
      where: { endpoint: data.endpoint },
      update: {
        idUsuario,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent || null,
      },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent || null,
        idUsuario,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar suscripción push:", error);
    return { success: false, error: error.message || "Error al registrar dispositivo para push." };
  }
}

export async function eliminarSuscripcionPushAction(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.pushSuscripcion.deleteMany({
      where: { endpoint },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar suscripción push:", error);
    return { success: false, error: error.message || "Error al remover suscripción." };
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

export async function notificarUsuarioPush(
  idUsuario: number,
  payload: PushNotificationPayload
): Promise<{ success: boolean; enviados: number }> {
  if (!publicKey || !privateKey) {
    console.warn("Web Push no configurado: omitiendo envío.");
    return { success: false, enviados: 0 };
  }

  const suscripciones = await prisma.pushSuscripcion.findMany({
    where: { idUsuario },
  });

  if (suscripciones.length === 0) {
    return { success: true, enviados: 0 };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/home",
    icon: payload.icon || "/apple-touch-icon.png",
    badge: payload.badge || "/favicon-32x32.png",
  });

  let enviados = 0;

  for (const s of suscripciones) {
    const pushSubscription = {
      endpoint: s.endpoint,
      keys: {
        p256dh: s.p256dh,
        auth: s.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payloadString);
      enviados++;
    } catch (err: any) {
      // 404 o 410 indican que la suscripción expiró o fue desinstalada en el navegador del usuario
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSuscripcion.deleteMany({
          where: { endpoint: s.endpoint },
        });
      } else {
        console.error("Fallo al enviar notificación push a endpoint:", err.message);
      }
    }
  }

  return { success: true, enviados };
}

export async function enviarPushPruebaAction(): Promise<{ success: boolean; enviados?: number; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Debes iniciar sesión para realizar la prueba." };
    }

    const res = await notificarUsuarioPush(session.idUsuario, {
      title: "InterlocApp · Notificación de Prueba",
      body: `Hola ${session.nombre}, tu dispositivo está sincronizado correctamente para recibir alertas operativas.`,
      url: "/home",
    });

    if (res.enviados === 0) {
      return {
        success: false,
        error: "No se encontró ningún navegador suscrito para tu cuenta. Activa primero las notificaciones en este dispositivo.",
      };
    }

    return { success: true, enviados: res.enviados };
  } catch (error: any) {
    console.error("Error en enviarPushPruebaAction:", error);
    return { success: false, error: error.message || "Error al disparar notificación de prueba." };
  }
}

