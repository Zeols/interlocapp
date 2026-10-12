"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/frontend/components/ui/card";
import { Label } from "@/frontend/components/ui/label";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import Icon from "@mdi/react";
import { mdiAccountOutline, mdiKeyOutline } from "@mdi/js";

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900">Perfil</h1>
        <p className="text-gray-500 mt-2">Gestiona tu información personal y opciones de seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <nav className="flex flex-col gap-2">
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer text-sm font-bold text-primary shadow-sm">
              <Icon path={mdiAccountOutline} size={0.8} />
              Datos Personales
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-transparent border border-transparent rounded-xl cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <Icon path={mdiKeyOutline} size={0.8} />
              Contraseña
            </button>
          </nav>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
              <CardDescription>
                Actualiza tu información básica para tus futuros viajes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" defaultValue="User" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" defaultValue="user@ejemplo.com" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" placeholder="+505 8888 8888" className="rounded-xl" />
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 rounded-b-2xl border-t border-gray-100 px-6 py-4">
              <Button className="rounded-xl font-bold">Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
