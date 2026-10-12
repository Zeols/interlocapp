"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/frontend/components/ui/card";
import { Label } from "@/frontend/components/ui/label";
import { Button } from "@/frontend/components/ui/button";
import Icon from "@mdi/react";
import { mdiBellOutline, mdiEarth, mdiCreditCardOutline } from "@mdi/js";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900">Ajustes</h1>
        <p className="text-gray-500 mt-2">Configura tus preferencias y experiencia en la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <nav className="flex flex-col gap-2">
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer text-sm font-bold text-primary shadow-sm">
              <Icon path={mdiBellOutline} size={0.8} />
              Notificaciones
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-transparent border border-transparent rounded-xl cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <Icon path={mdiEarth} size={0.8} />
              Región e Idioma
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-transparent border border-transparent rounded-xl cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <Icon path={mdiCreditCardOutline} size={0.8} />
              Pagos
            </button>
          </nav>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>
                Elige qué alertas quieres recibir en tu correo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base">Boletos Comprados</Label>
                  <p className="text-sm text-gray-500 mt-1">Recibe tus boletos directamente en el correo.</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="h-px w-full bg-gray-100"></div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base">Promociones y Ofertas</Label>
                  <p className="text-sm text-gray-500 mt-1">Entérate de descuentos en rutas seleccionadas.</p>
                </div>
                <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer transition-colors">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 rounded-b-2xl border-t border-gray-100 px-6 py-4">
              <Button className="rounded-xl font-bold">Guardar Preferencias</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
