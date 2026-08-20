import React from "react";
import { Navbar } from "@/components/layout/Navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
