import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckSquare,
  Flame,
  TrendingUp,
  DollarSign,
  Sparkles,
  Brain,
  Activity,
} from "lucide-react";
import { TrendChart } from "./TrendChart";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["todo", "in_progress"])
    .lte("due_date", today)
    .order("priority", { ascending: true })
    .limit(10);

  const { data: latestMetric } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("metric_date", today)
    .maybeSingle();

  const { data: latestInsight } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestSnippet } = await supabase
    .from("brain_notes")
    .select("*")
    .eq("type", "snippet")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const week7Start = format(new Date(Date.now() - 6 * 86400000), "yyyy-MM-dd");

  const [{ data: habits }, { data: weekMetrics }] = await Promise.all([
    supabase.from("habits").select("*").eq("frequency", "daily").order("created_at"),
    supabase.from("daily_metrics")
      .select("metric_date, mood_score, energy_level, sleep_hours")
      .gte("metric_date", week7Start)
      .order("metric_date"),
  ]);

  const { data: habitLogs } = await supabase
    .from("habit_logs")
    .select("habit_id")
    .eq("log_date", today)
    .eq("completed", true);

  const p1Tasks = todayTasks?.filter((t) => t.priority === "P1") ?? [];
  const allTasks = todayTasks ?? [];
  const completedHabitIds = new Set((habitLogs ?? []).map((l) => l.habit_id));
  const dailyHabits = habits ?? [];
  const completedCount = dailyHabits.filter((h) => completedHabitIds.has(h.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-muted-foreground text-sm capitalize">{displayDate}</p>
        <h2 className="text-2xl font-bold mt-0.5">Buenos días 👋</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today Focus */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Focus de hoy</h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {allTasks.length} pendientes
              </span>
            </div>

            {p1Tasks.length === 0 && allTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Sin tareas pendientes para hoy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === "P1"
                          ? "bg-red-500"
                          : task.priority === "P2"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                        task.priority === "P1"
                          ? "bg-red-500/10 text-red-400"
                          : task.priority === "P2"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Habits */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold">Hábitos de hoy</h3>
              {dailyHabits.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {completedCount}/{dailyHabits.length}
                </span>
              )}
            </div>
            {dailyHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Configura tus hábitos en la sección de Hábitos
              </p>
            ) : (
              <div className="space-y-2">
                {dailyHabits.map((habit) => {
                  const done = completedHabitIds.has(habit.id);
                  return (
                    <div key={habit.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${done ? "bg-orange-500 border-orange-500" : "border-border"}`}>
                        {done && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="text-sm">{habit.icon} {habit.name}</span>
                      {done && <span className="ml-auto text-xs text-orange-400">✓</span>}
                    </div>
                  );
                })}
                {dailyHabits.length > 0 && (
                  <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${dailyHabits.length > 0 ? (completedCount / dailyHabits.length) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Panel */}
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Mood</span>
              </div>
              <p className="text-2xl font-bold">
                {latestMetric?.mood_score ?? "—"}
                {latestMetric?.mood_score && (
                  <span className="text-xs text-muted-foreground ml-1">/10</span>
                )}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Peso</span>
              </div>
              <p className="text-2xl font-bold">
                {latestMetric?.weight_kg ?? "—"}
                {latestMetric?.weight_kg && (
                  <span className="text-xs text-muted-foreground ml-1">kg</span>
                )}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-muted-foreground">Kcal</span>
              </div>
              <p className="text-2xl font-bold">
                {latestMetric?.calories_kcal
                  ? (latestMetric.calories_kcal / 1000).toFixed(1) + "k"
                  : "—"}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Finanzas</span>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Ver</p>
            </div>
          </div>

          {/* AI Insight */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-sm">Insight del día</h3>
            </div>
            {latestInsight ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {latestInsight.content}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Registra métricas y completa tareas para que la IA genere insights
                personalizados.
              </p>
            )}
          </div>

          {/* 7-day trend */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h3 className="font-semibold text-sm">Tendencia 7 días</h3>
            </div>
            <TrendChart data={weekMetrics ?? []} />
          </div>

          {/* Latest Snippet */}
          {latestSnippet && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm">Último snippet</h3>
              </div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {latestSnippet.title}
              </p>
              <pre className="text-xs bg-secondary/60 rounded-lg p-3 overflow-x-auto text-foreground/80 max-h-24">
                <code>{(latestSnippet.content as string).slice(0, 200)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
