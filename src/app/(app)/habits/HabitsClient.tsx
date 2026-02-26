"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, Flame } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  frequency: string;
  target_streak: number;
};
type HabitLog = { id: string; habit_id: string; log_date: string; completed: boolean };
type RecentLog = { habit_id: string; log_date: string; completed: boolean };

interface HabitsClientProps {
  initialHabits: Habit[];
  todayLogs: HabitLog[];
  recentLogs: RecentLog[];
  today: string;
}

const ICONS = ["🏃", "📚", "🧘", "💧", "🥗", "💊", "🛌", "✍️", "🎯", "💪", "🧹", "🎸"];

function buildHeatmapDays(recentLogs: RecentLog[], habits: Habit[], today: string) {
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const date = format(subDays(parseISO(today), i), "yyyy-MM-dd");
    const logsOnDay = recentLogs.filter((l) => l.log_date === date);
    const completedOnDay = logsOnDay.length;
    const total = habits.length;
    const pct = total > 0 ? completedOnDay / total : 0;
    days.push({ date, pct, completed: completedOnDay, total });
  }
  return days;
}

export function HabitsClient({ initialHabits, todayLogs, recentLogs, today }: HabitsClientProps) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(todayLogs);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "🎯", target_streak: 30 });

  const completedIds = new Set(logs.filter((l) => l.completed).map((l) => l.habit_id));
  const completedCount = completedIds.size;

  async function toggleHabit(habit: Habit) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = logs.find((l) => l.habit_id === habit.id);

    if (existing) {
      const newCompleted = !existing.completed;
      await supabase
        .from("habit_logs")
        .update({ completed: newCompleted })
        .eq("id", existing.id);
      setLogs((prev) =>
        prev.map((l) => l.id === existing.id ? { ...l, completed: newCompleted } : l)
      );
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, user_id: user.id, log_date: today, completed: true })
        .select()
        .single();
      if (data) setLogs((prev) => [...prev, data as HabitLog]);
    }
  }

  async function createHabit() {
    if (!form.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name: form.name, icon: form.icon, target_streak: form.target_streak })
      .select()
      .single();
    if (data) setHabits((prev) => [...prev, data as Habit]);
    setShowForm(false);
    setForm({ name: "", icon: "🎯", target_streak: 30 });
  }

  async function deleteHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habit_id !== id));
  }

  const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
  const heatmapDays = buildHeatmapDays(recentLogs, habits, today);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hábitos</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {completedCount}/{habits.length} completados hoy
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo hábito
        </button>
      </div>

      {/* Progress + Heatmap */}
      {habits.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Flame className={cn("w-5 h-5", pct === 100 ? "text-orange-400" : "text-muted-foreground")} />
              <span className="font-semibold text-sm">Progreso diario</span>
            </div>
            <span className="text-2xl font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 100 ? "bg-orange-400" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 28-day heatmap */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Últimos 28 días</p>
            <div className="grid grid-cols-28 gap-1" style={{ gridTemplateColumns: `repeat(28, minmax(0, 1fr))` }}>
              {heatmapDays.map((d) => (
                <div
                  key={d.date}
                  title={`${format(parseISO(d.date), "d MMM", { locale: es })}: ${d.completed}/${d.total}`}
                  className="aspect-square rounded-sm transition-colors"
                  style={{
                    backgroundColor:
                      d.pct === 0
                        ? "hsl(var(--secondary))"
                        : d.pct < 0.5
                        ? "rgba(249,115,22,0.3)"
                        : d.pct < 1
                        ? "rgba(249,115,22,0.6)"
                        : "rgba(249,115,22,1)",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 justify-end">
              <span className="text-xs text-muted-foreground">Menos</span>
              {[0, 0.3, 0.6, 1].map((op) => (
                <div key={op} className="w-3 h-3 rounded-sm" style={{ backgroundColor: op === 0 ? "hsl(var(--secondary))" : `rgba(249,115,22,${op})` }} />
              ))}
              <span className="text-xs text-muted-foreground">Más</span>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nuevo hábito</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-accent rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nombre del hábito"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm((p) => ({ ...p, icon }))}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    form.icon === icon ? "ring-2 ring-primary bg-primary/10" : "hover:bg-accent"
                  )}
                >{icon}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground flex-shrink-0">Meta de racha:</label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.target_streak}
              onChange={(e) => setForm((p) => ({ ...p, target_streak: parseInt(e.target.value) || 30 }))}
              className="w-24 px-3 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button
              onClick={createHabit}
              disabled={!form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Crear
            </button>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Flame className="w-12 h-12 text-orange-400/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Crea tu primer hábito para comenzar a construir tu racha.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const done = completedIds.has(habit.id);
            return (
              <div
                key={habit.id}
                className={cn(
                  "glass rounded-xl px-4 py-4 flex items-center gap-4 transition-all",
                  done && "border-green-500/30"
                )}
              >
                <button
                  onClick={() => toggleHabit(habit)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    done
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-border hover:border-primary"
                  )}
                >
                  {done && <Check className="w-4 h-4" />}
                </button>
                <span className="text-xl flex-shrink-0">{habit.icon ?? "🎯"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium", done && "line-through text-muted-foreground")}>
                    {habit.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Meta: {habit.target_streak} días · {habit.frequency === "daily" ? "Diario" : "Semanal"}
                  </p>
                </div>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
