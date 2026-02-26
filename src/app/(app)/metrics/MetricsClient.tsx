"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart2, Save, ChevronDown, ChevronUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";

type Metric = {
  id: string;
  metric_date: string;
  mood_score: number | null;
  weight_kg: number | null;
  calories_kcal: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy_level: number | null;
  stress_level: number | null;
  journal_entry: string | null;
};

interface MetricsClientProps {
  initialHistory: Metric[];
}

const FIELDS = [
  { key: "mood_score",    label: "Mood",           unit: "/10", min: 1, max: 10, step: 1,   color: "#8B5CF6" },
  { key: "weight_kg",     label: "Peso",            unit: "kg",  min: 30, max: 200, step: 0.1, color: "#10B981" },
  { key: "calories_kcal", label: "Calorías",        unit: "kcal",min: 0, max: 5000, step: 50, color: "#F59E0B" },
  { key: "sleep_hours",   label: "Sueño",           unit: "h",   min: 0, max: 24, step: 0.25, color: "#6366F1" },
  { key: "sleep_quality", label: "Calidad sueño",   unit: "/10", min: 1, max: 10, step: 1,   color: "#3B82F6" },
  { key: "energy_level",  label: "Energía",         unit: "/10", min: 1, max: 10, step: 1,   color: "#F97316" },
  { key: "stress_level",  label: "Estrés",          unit: "/10", min: 1, max: 10, step: 1,   color: "#EF4444" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

export function MetricsClient({ initialHistory }: MetricsClientProps) {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayRecord = initialHistory.find((m) => m.metric_date === today);

  const [history, setHistory] = useState<Metric[]>(initialHistory);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeChart, setActiveChart] = useState<FieldKey>("mood_score");
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState<Record<FieldKey, string> & { journal_entry: string }>({
    mood_score:    todayRecord?.mood_score?.toString()    ?? "",
    weight_kg:     todayRecord?.weight_kg?.toString()     ?? "",
    calories_kcal: todayRecord?.calories_kcal?.toString() ?? "",
    sleep_hours:   todayRecord?.sleep_hours?.toString()   ?? "",
    sleep_quality: todayRecord?.sleep_quality?.toString() ?? "",
    energy_level:  todayRecord?.energy_level?.toString()  ?? "",
    stress_level:  todayRecord?.stress_level?.toString()  ?? "",
    journal_entry: todayRecord?.journal_entry             ?? "",
  });

  function parseNum(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      metric_date: today,
      mood_score:    parseNum(form.mood_score),
      weight_kg:     parseNum(form.weight_kg),
      calories_kcal: parseNum(form.calories_kcal),
      sleep_hours:   parseNum(form.sleep_hours),
      sleep_quality: parseNum(form.sleep_quality),
      energy_level:  parseNum(form.energy_level),
      stress_level:  parseNum(form.stress_level),
      journal_entry: form.journal_entry || null,
    };

    const { data } = await supabase
      .from("daily_metrics")
      .upsert(payload, { onConflict: "user_id,metric_date" })
      .select()
      .single();

    if (data) {
      const updated = data as Metric;
      setHistory((prev) =>
        prev.some((m) => m.metric_date === today)
          ? prev.map((m) => (m.metric_date === today ? updated : m))
          : [updated, ...prev]
      );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const chartData = [...history]
    .reverse()
    .slice(-14)
    .map((m) => ({
      date: format(new Date(m.metric_date + "T00:00:00"), "d/M"),
      value: m[activeChart as keyof Metric] as number | null,
    }))
    .filter((d) => d.value !== null);

  const activeField = FIELDS.find((f) => f.key === activeChart)!;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métricas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de hoy — {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
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
          <Save className="w-4 h-4" />
          {saved ? "Guardado ✓" : saving ? "Guardando..." : "Guardar hoy"}
        </button>
      </div>

      {/* Input Form Grid */}
      <div className="glass rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-muted-foreground mb-1.5">
              {field.label}
              <span className="text-primary/60 ml-1">{field.unit}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.key]}
                onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder="—"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-3 lg:col-span-4">
          <label className="block text-xs text-muted-foreground mb-1.5">Diario</label>
          <textarea
            value={form.journal_entry}
            onChange={(e) => setForm((p) => ({ ...p, journal_entry: e.target.value }))}
            placeholder="¿Cómo estuvo tu día? Pensamientos, logros, aprendizajes..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
          />
        </div>
      </div>

      {/* Chart */}
      {history.length > 1 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <BarChart2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Últimos 14 días</span>
            <div className="flex gap-1 ml-auto flex-wrap">
              {FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveChart(f.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs transition-colors",
                    activeChart === f.key
                      ? "text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  style={activeChart === f.key ? { backgroundColor: f.color } : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={activeField.color}
                strokeWidth={2}
                dot={{ r: 3, fill: activeField.color }}
                name={activeField.label}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
          >
            <span className="font-semibold text-sm">Historial ({history.length} registros)</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {history.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-muted-foreground w-24 flex-shrink-0">
                    {format(new Date(m.metric_date + "T00:00:00"), "d MMM yyyy", { locale: es })}
                  </span>
                  {FIELDS.map((f) => {
                    const v = m[f.key as keyof Metric];
                    if (v == null) return null;
                    return (
                      <span key={f.key} className="text-xs bg-secondary px-2 py-0.5 rounded-md">
                        {f.label}: <strong>{v as number}{f.unit.startsWith("/") ? "" : f.unit}</strong>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
