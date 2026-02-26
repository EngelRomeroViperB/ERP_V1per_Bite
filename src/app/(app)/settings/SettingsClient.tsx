"use client";

import { useEffect, useState } from "react";
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

function parsePreferenceList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("No configurado");
  const initialPreferences = (initialProfile?.preferences ?? {}) as Record<string, unknown>;
  const [form, setForm] = useState({
    full_name: initialProfile?.full_name ?? "",
    timezone: initialProfile?.timezone ?? "America/Bogota",
    mood_labels: parsePreferenceList(initialPreferences.mood_labels).join(", "),
    energy_labels: parsePreferenceList(initialPreferences.energy_labels).join(", "),
  });

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notificationSupported = "Notification" in window;
    const swSupported = "serviceWorker" in navigator;
    if (!notificationSupported || !swSupported) {
      setPushStatus("No compatible en este navegador");
      return;
    }
    if (Notification.permission === "granted") {
      setPushStatus("Permiso concedido");
    } else if (Notification.permission === "denied") {
      setPushStatus("Permiso bloqueado en el navegador");
    }
  });

  function base64ToUint8Array(base64: string) {
    const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const raw = window.atob(padded);
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  }

  async function enablePushNotifications() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setPushStatus("No compatible en este navegador");
      return;
    }
    if (!vapidKey) {
      setPushStatus("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en .env");
      return;
    }

    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("Permiso denegado");
        setPushEnabled(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(vapidKey),
        }));

      const res = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, enabled: true }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la suscripción");

      setPushEnabled(true);
      setPushStatus("Push activadas ✅");
    } catch {
      setPushStatus("Error configurando push");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePushNotifications() {
    if (!("serviceWorker" in navigator)) return;
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: null, enabled: false }),
      });
      setPushEnabled(false);
      setPushStatus("Push desactivadas");
    } catch {
      setPushStatus("No se pudo desactivar");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        timezone: form.timezone,
        preferences: {
          ...initialPreferences,
          mood_labels: form.mood_labels
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 10),
          energy_labels: form.energy_labels
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 10),
        },
      })
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

      {/* Personalization */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold">Personalización</h3>
        <p className="text-xs text-muted-foreground">
          Define etiquetas personalizadas para escalas (separadas por coma). Ejemplo: "Muy mal, Mal, Neutral, Bien, Excelente".
        </p>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Etiquetas de Mood (1-10)</label>
          <input
            type="text"
            value={form.mood_labels}
            onChange={(e) => setForm((p) => ({ ...p, mood_labels: e.target.value }))}
            placeholder="Muy bajo, Bajo, Normal, Alto, Excelente"
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Etiquetas de Energía (1-10)</label>
          <input
            type="text"
            value={form.energy_labels}
            onChange={(e) => setForm((p) => ({ ...p, energy_labels: e.target.value }))}
            placeholder="Sin energía, Bajo, Funcional, Enfocado, Imparable"
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>

      {/* Notifications placeholder */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Notificaciones</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Configura notificaciones push del navegador para recordatorios y alertas.
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Requiere `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `.env.local`.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={enablePushNotifications}
            disabled={pushBusy}
            className="px-3 py-2 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pushBusy ? "Configurando..." : "Activar push"}
          </button>
          <button
            onClick={disablePushNotifications}
            disabled={pushBusy}
            className="px-3 py-2 rounded-lg text-xs border border-border hover:bg-accent disabled:opacity-60"
          >
            Desactivar
          </button>
          <span className={cn("text-xs", pushEnabled ? "text-green-400" : "text-muted-foreground")}>{pushStatus}</span>
        </div>
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
