"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Save, User, Bell, Shield, LogOut, Check, Clock3, SlidersHorizontal, Wallet, Tag, ExternalLink, RefreshCw } from "lucide-react";
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

const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<(typeof WEEK_DAYS)[number], string> = {
  mon: "L", tue: "M", wed: "X", thu: "J", fri: "V", sat: "S", sun: "D",
};
const CAPTURE_CATEGORIES = ["task", "habit", "finance", "note"] as const;
const NOTIFICATION_TYPES = [
  { key: "task", label: "Tareas" },
  { key: "habit", label: "Hábitos" },
  { key: "finance", label: "Finanzas" },
] as const;

function parsePreferenceList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parsePreferenceString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePreferenceNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parsePreferenceBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const profile = initialProfile;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("No configurado");
  const initialPreferences = (initialProfile?.preferences ?? {}) as Record<string, unknown>;

  const notionConnected = Boolean(initialPreferences.notion_access_token);
  const notionWorkspace = parsePreferenceString(initialPreferences.notion_workspace_name);

  const [form, setForm] = useState({
    full_name: initialProfile?.full_name ?? "",
    timezone: initialProfile?.timezone ?? "America/Bogota",
    push_public_key: parsePreferenceString(initialPreferences.push_vapid_public_key),
    reminder_start_time: parsePreferenceString(initialPreferences.reminder_start_time) || "07:00",
    reminder_end_time: parsePreferenceString(initialPreferences.reminder_end_time) || "22:00",
    reminder_active_days: parsePreferenceList(initialPreferences.reminder_active_days),
    notify_task_push: parsePreferenceBoolean(initialPreferences.notify_task_push, true),
    notify_task_email: parsePreferenceBoolean(initialPreferences.notify_task_email, false),
    notify_task_inapp: parsePreferenceBoolean(initialPreferences.notify_task_inapp, true),
    notify_habit_push: parsePreferenceBoolean(initialPreferences.notify_habit_push, true),
    notify_habit_email: parsePreferenceBoolean(initialPreferences.notify_habit_email, false),
    notify_habit_inapp: parsePreferenceBoolean(initialPreferences.notify_habit_inapp, true),
    notify_finance_push: parsePreferenceBoolean(initialPreferences.notify_finance_push, true),
    notify_finance_email: parsePreferenceBoolean(initialPreferences.notify_finance_email, false),
    notify_finance_inapp: parsePreferenceBoolean(initialPreferences.notify_finance_inapp, true),
    goal_daily_spend_limit: String(parsePreferenceNumber(initialPreferences.goal_daily_spend_limit, 0)),
    quick_capture_default_priority: parsePreferenceString(initialPreferences.quick_capture_default_priority) || "P2",
    quick_capture_favorite_categories: parsePreferenceList(initialPreferences.quick_capture_favorite_categories),
    quick_capture_auto_tags: parsePreferenceList(initialPreferences.quick_capture_auto_tags).join(", "),
    finance_currency: parsePreferenceString(initialPreferences.finance_currency) || "COP",
    finance_locale: parsePreferenceString(initialPreferences.finance_locale) || "es-CO",
    finance_use_grouping: parsePreferenceBoolean(initialPreferences.finance_use_grouping, true),
  });

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || form.push_public_key.trim();

  function notifyField(type: "task" | "habit" | "finance", channel: "push" | "email" | "inapp") {
    return `notify_${type}_${channel}` as const;
  }

  function getNotify(type: "task" | "habit" | "finance", channel: "push" | "email" | "inapp") {
    const key = notifyField(type, channel);
    return Boolean(form[key]);
  }

  function setNotify(type: "task" | "habit" | "finance", channel: "push" | "email" | "inapp", value: boolean) {
    const key = notifyField(type, channel);
    setForm((p) => ({ ...p, [key]: value }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notificationSupported = "Notification" in window;
    const swSupported = "serviceWorker" in navigator;
    if (!notificationSupported || !swSupported) {
      setPushStatus("No compatible en este navegador");
      return;
    }
    if (!vapidKey) {
      setPushStatus("Configura tu VAPID public key para activar push");
      return;
    }
    if (Notification.permission === "granted") {
      setPushStatus("Permiso concedido");
      setPushEnabled(true);
    } else if (Notification.permission === "denied") {
      setPushStatus("Permiso bloqueado en el navegador");
    }
  }, [vapidKey]);

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
          push_vapid_public_key: form.push_public_key.trim() || null,
          reminder_start_time: form.reminder_start_time,
          reminder_end_time: form.reminder_end_time,
          reminder_active_days: form.reminder_active_days,
          notify_task_push: form.notify_task_push,
          notify_task_email: form.notify_task_email,
          notify_task_inapp: form.notify_task_inapp,
          notify_habit_push: form.notify_habit_push,
          notify_habit_email: form.notify_habit_email,
          notify_habit_inapp: form.notify_habit_inapp,
          notify_finance_push: form.notify_finance_push,
          notify_finance_email: form.notify_finance_email,
          notify_finance_inapp: form.notify_finance_inapp,
          goal_daily_spend_limit: Number(form.goal_daily_spend_limit) || 0,
          quick_capture_default_priority: form.quick_capture_default_priority,
          quick_capture_favorite_categories: form.quick_capture_favorite_categories,
          quick_capture_auto_tags: form.quick_capture_auto_tags
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 12),
          finance_currency: form.finance_currency,
          finance_locale: form.finance_locale,
          finance_use_grouping: form.finance_use_grouping,
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
      </div>

      {/* Notion Connection */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Conexión Notion</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full", notionConnected ? "bg-green-500" : "bg-red-500")} />
          <div className="flex-1">
            <p className="text-sm font-medium">{notionConnected ? "Conectado" : "No conectado"}</p>
            {notionWorkspace && (
              <p className="text-xs text-muted-foreground">Workspace: {notionWorkspace}</p>
            )}
          </div>
          <a
            href="/api/notion/authorize"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {notionConnected ? "Reconectar" : "Conectar"}
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Al conectar, el ERP podrá leer y escribir en tus bases de datos de Notion (Tareas, Proyectos, Finanzas, Brain, etc.).
        </p>
      </div>

      {/* Finance Settings */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Moneda y formato financiero</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Moneda</label>
            <select value={form.finance_currency} onChange={(e) => setForm((p) => ({ ...p, finance_currency: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Formato</label>
            <select value={form.finance_locale} onChange={(e) => setForm((p) => ({ ...p, finance_locale: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
              <option value="es-CO">es-CO</option>
              <option value="en-US">en-US</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.finance_use_grouping} onChange={(e) => setForm((p) => ({ ...p, finance_use_grouping: e.target.checked }))} />
            Separadores de miles
          </label>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Tope gasto diario</label>
            <input type="number" value={form.goal_daily_spend_limit} onChange={(e) => setForm((p) => ({ ...p, goal_daily_spend_limit: e.target.value }))} placeholder="0" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
          </div>
        </div>
      </div>

      {/* Reminder Schedule */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Horario de recordatorios</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Desde</label>
            <input
              type="time"
              value={form.reminder_start_time}
              onChange={(e) => setForm((p) => ({ ...p, reminder_start_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Hasta</label>
            <input
              type="time"
              value={form.reminder_end_time}
              onChange={(e) => setForm((p) => ({ ...p, reminder_end_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => {
            const active = form.reminder_active_days.includes(day);
            return (
              <button
                type="button"
                key={day}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    reminder_active_days: active
                      ? p.reminder_active_days.filter((d) => d !== day)
                      : [...p.reminder_active_days, day],
                  }))
                }
                className={cn(
                  "w-8 h-8 rounded-lg text-xs border transition-colors",
                  active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                )}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Channels */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Canales por tipo</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Push web funciona incluso fuera de la pestaña activa si el navegador lo permite.
        </p>
        {NOTIFICATION_TYPES.map((row) => (
          <div key={row.key} className="grid grid-cols-4 gap-2 items-center text-xs">
            <span className="font-medium">{row.label}</span>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={getNotify(row.key, "push")} onChange={(e) => setNotify(row.key, "push", e.target.checked)} />Push</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={getNotify(row.key, "email")} onChange={(e) => setNotify(row.key, "email", e.target.checked)} />Email</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={getNotify(row.key, "inapp")} onChange={(e) => setNotify(row.key, "inapp", e.target.checked)} />In-app</label>
          </div>
        ))}
      </div>

      {/* Quick Capture */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Reglas de quick capture</h3>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Prioridad default de tareas</label>
          <select value={form.quick_capture_default_priority} onChange={(e) => setForm((p) => ({ ...p, quick_capture_default_priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Categorías favoritas</label>
          <div className="flex flex-wrap gap-2">
            {CAPTURE_CATEGORIES.map((category) => {
              const active = form.quick_capture_favorite_categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      quick_capture_favorite_categories: active
                        ? p.quick_capture_favorite_categories.filter((c) => c !== category)
                        : [...p.quick_capture_favorite_categories, category],
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                    active ? "bg-primary/10 text-primary border-primary/40" : "border-border hover:bg-accent"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Auto-tags para notas</label>
          <div className="relative">
            <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={form.quick_capture_auto_tags}
              onChange={(e) => setForm((p) => ({ ...p, quick_capture_auto_tags: e.target.value }))}
              placeholder="captura, inbox, voz"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Notificaciones push</h3>
        </div>
        <div className="mb-3 space-y-1.5">
          <label className="block text-xs text-muted-foreground">VAPID public key</label>
          <input
            type="text"
            value={form.push_public_key}
            onChange={(e) => setForm((p) => ({ ...p, push_public_key: e.target.value }))}
            placeholder="BEl... (clave pública VAPID)"
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            La clave privada debe vivir solo en servidor/Vercel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={enablePushNotifications}
            disabled={pushBusy || !vapidKey}
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

      {/* Save Button */}
      <div className="glass rounded-2xl p-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors w-full justify-center",
            saved
              ? "bg-green-500/20 text-green-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Guardado" : saving ? "Guardando..." : "Guardar cambios"}
        </button>
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
