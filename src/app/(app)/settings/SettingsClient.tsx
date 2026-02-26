"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Save, User, Bell, Shield, LogOut, Check, Clock3, Target, SlidersHorizontal, Wallet, LayoutDashboard, Tag } from "lucide-react";
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
const CAPTURE_CATEGORIES = ["task", "habit", "metric", "finance", "note"] as const;
const DASHBOARD_CARD_KEYS = ["mood", "weight", "kcal", "finance"] as const;
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
  const [form, setForm] = useState({
    full_name: initialProfile?.full_name ?? "",
    timezone: initialProfile?.timezone ?? "America/Bogota",
    mood_labels: parsePreferenceList(initialPreferences.mood_labels).join(", "),
    energy_labels: parsePreferenceList(initialPreferences.energy_labels).join(", "),
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
    goal_water_liters: String(parsePreferenceNumber(initialPreferences.goal_water_liters, 2)),
    goal_sleep_hours: String(parsePreferenceNumber(initialPreferences.goal_sleep_hours, 8)),
    goal_steps: String(parsePreferenceNumber(initialPreferences.goal_steps, 8000)),
    goal_daily_spend_limit: String(parsePreferenceNumber(initialPreferences.goal_daily_spend_limit, 0)),
    quick_capture_default_priority: parsePreferenceString(initialPreferences.quick_capture_default_priority) || "P2",
    quick_capture_favorite_categories: parsePreferenceList(initialPreferences.quick_capture_favorite_categories),
    quick_capture_auto_tags: parsePreferenceList(initialPreferences.quick_capture_auto_tags).join(", "),
    finance_currency: parsePreferenceString(initialPreferences.finance_currency) || "COP",
    finance_locale: parsePreferenceString(initialPreferences.finance_locale) || "es-CO",
    finance_use_grouping: parsePreferenceBoolean(initialPreferences.finance_use_grouping, true),
    dashboard_visible_cards: parsePreferenceList(initialPreferences.dashboard_visible_cards).length
      ? parsePreferenceList(initialPreferences.dashboard_visible_cards)
      : [...DASHBOARD_CARD_KEYS],
    dashboard_card_order: parsePreferenceList(initialPreferences.dashboard_card_order).length
      ? parsePreferenceList(initialPreferences.dashboard_card_order)
      : [...DASHBOARD_CARD_KEYS],
    dashboard_trend_days: String(parsePreferenceNumber(initialPreferences.dashboard_trend_days, 7)),
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

  function moveDashboardCard(card: string, direction: "up" | "down") {
    setForm((p) => {
      const index = p.dashboard_card_order.indexOf(card);
      if (index === -1) return p;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= p.dashboard_card_order.length) return p;
      const next = [...p.dashboard_card_order];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...p, dashboard_card_order: next };
    });
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
          goal_water_liters: Number(form.goal_water_liters) || 0,
          goal_sleep_hours: Number(form.goal_sleep_hours) || 0,
          goal_steps: Number(form.goal_steps) || 0,
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
          dashboard_visible_cards: form.dashboard_visible_cards,
          dashboard_card_order: form.dashboard_card_order,
          dashboard_trend_days: Number(form.dashboard_trend_days) || 7,
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

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Canales por tipo</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Push web (service worker) funciona incluso fuera de la pestaña activa si el navegador lo permite.
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

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Objetivos por defecto</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={form.goal_water_liters} onChange={(e) => setForm((p) => ({ ...p, goal_water_liters: e.target.value }))} placeholder="Agua (L)" className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
          <input type="number" value={form.goal_sleep_hours} onChange={(e) => setForm((p) => ({ ...p, goal_sleep_hours: e.target.value }))} placeholder="Sueño (h)" className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
          <input type="number" value={form.goal_steps} onChange={(e) => setForm((p) => ({ ...p, goal_steps: e.target.value }))} placeholder="Pasos" className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
          <input type="number" value={form.goal_daily_spend_limit} onChange={(e) => setForm((p) => ({ ...p, goal_daily_spend_limit: e.target.value }))} placeholder="Tope gasto diario" className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
        </div>
      </div>

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

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Moneda y formato financiero</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.finance_currency} onChange={(e) => setForm((p) => ({ ...p, finance_currency: e.target.value }))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
          <select value={form.finance_locale} onChange={(e) => setForm((p) => ({ ...p, finance_locale: e.target.value }))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            <option value="es-CO">es-CO</option>
            <option value="en-US">en-US</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.finance_use_grouping} onChange={(e) => setForm((p) => ({ ...p, finance_use_grouping: e.target.checked }))} />
          Usar separadores de miles
        </label>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Preferencias de dashboard</h3>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Rango de tendencia (días)</label>
          <select value={form.dashboard_trend_days} onChange={(e) => setForm((p) => ({ ...p, dashboard_trend_days: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            <option value="7">7</option>
            <option value="14">14</option>
            <option value="30">30</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Cards visibles</label>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_CARD_KEYS.map((key) => {
              const active = form.dashboard_visible_cards.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      dashboard_visible_cards: active
                        ? p.dashboard_visible_cards.filter((k) => k !== key)
                        : [...p.dashboard_visible_cards, key],
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border",
                    active ? "bg-primary/10 text-primary border-primary/40" : "border-border hover:bg-accent"
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Orden de cards</label>
          <div className="space-y-1.5">
            {form.dashboard_card_order.map((card, index) => (
              <div key={card} className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs">
                <span>{index + 1}. {card}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveDashboardCard(card, "up")} className="px-2 py-0.5 rounded border border-border hover:bg-accent">↑</button>
                  <button type="button" onClick={() => moveDashboardCard(card, "down")} className="px-2 py-0.5 rounded border border-border hover:bg-accent">↓</button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
          Define etiquetas personalizadas para escalas (separadas por coma). Ejemplo: &quot;Muy mal, Mal, Neutral, Bien, Excelente&quot;.
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
          Puedes usar `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `.env.local` o guardar la clave pública aquí.
        </p>
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
            La clave privada (`VAPID_PRIVATE_KEY`) debe vivir solo en servidor/Vercel.
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
