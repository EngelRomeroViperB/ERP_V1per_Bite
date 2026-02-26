"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Save, User, Bell, Shield, LogOut, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  preferences: Record<string, unknown>;
};

interface SettingsClientProps {
  initialProfile: Profile | null;
}

const TIMEZONES = [
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: initialProfile?.full_name ?? "",
    timezone: initialProfile?.timezone ?? "America/Bogota",
  });

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({ full_name: form.full_name, timezone: form.timezone })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Gestiona tu perfil y preferencias</p>
      </div>

      {/* Profile */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Perfil</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {form.full_name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{form.full_name || "Sin nombre"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {profile?.id?.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Nombre completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Tu nombre"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Zona horaria</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            saved
              ? "bg-green-500/20 text-green-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Guardado" : saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Notifications placeholder */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Notificaciones</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Las notificaciones push estarán disponibles cuando se configure VAPID en `.env.local`.
        </p>
      </div>

      {/* Security */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Seguridad</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Autenticación gestionada por Supabase con Magic Link y Google OAuth.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground">Proveedor</p>
            <p className="font-semibold mt-0.5">Supabase Auth</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground">RLS activo</p>
            <p className="font-semibold mt-0.5 text-green-400">✓ Todas las tablas</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass rounded-2xl p-6 border-destructive/30">
        <h3 className="font-semibold text-destructive/80 mb-3">Zona peligrosa</h3>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
