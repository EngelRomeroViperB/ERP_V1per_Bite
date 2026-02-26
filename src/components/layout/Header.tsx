"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Plus, Zap } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-semibold flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowQuickCapture(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Captura rápida</span>
        </button>

        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {showQuickCapture && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQuickCapture(false)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Captura rápida</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Escribe en lenguaje natural — el sistema lo clasifica automáticamente.
            </p>
            <textarea
              autoFocus
              placeholder='Ej: "Mañana entregar informe de estadística" o "Pesé 74.5kg hoy"'
              className="w-full h-28 px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none placeholder:text-muted-foreground"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowQuickCapture(false)}
                className="px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Procesar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
