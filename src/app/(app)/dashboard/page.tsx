import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  Sparkles,
} from "lucide-react";
import { FinanceTrendChart } from "./FinanceTrendChart";
import { ActionButtons } from "@/components/notion/ActionButtons";
import { NotionTasks } from "@/components/notion/NotionTasks";
import { NotionProjects } from "@/components/notion/NotionProjects";
import { DashboardHabits } from "./DashboardHabits";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .single();
  const preferences = (profile?.preferences ?? {}) as Record<string, unknown>;

  const financeCurrency = typeof preferences.finance_currency === "string" ? preferences.finance_currency : "COP";
  const financeLocale = typeof preferences.finance_locale === "string" ? preferences.finance_locale : "es-CO";
  const financeUseGrouping = typeof preferences.finance_use_grouping === "boolean" ? preferences.finance_use_grouping : true;

  const days14Start = format(new Date(Date.now() - 13 * 86400000), "yyyy-MM-dd");

  const [{ data: habits }, { data: habitLogs }, { data: recentFinances }, { data: latestInsight }] =
    await Promise.all([
      supabase.from("habits").select("*").eq("frequency", "daily").order("created_at"),
      supabase.from("habit_logs").select("*").eq("log_date", today),
      supabase
        .from("finances")
        .select("transaction_date, amount, type, source")
        .gte("transaction_date", days14Start)
        .order("transaction_date", { ascending: true }),
      supabase
        .from("ai_insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const dailyHabits = habits ?? [];
  const todayLogs = habitLogs ?? [];

  const dayMap = new Map<string, { income: number; expense: number }>();
  for (let i = 13; i >= 0; i -= 1) {
    const date = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
    dayMap.set(date, { income: 0, expense: 0 });
  }
  for (const tx of recentFinances ?? []) {
    const row = dayMap.get(tx.transaction_date);
    if (!row) continue;
    if (tx.type === "income") row.income += Number(tx.amount ?? 0);
    else row.expense += Number(tx.amount ?? 0);
  }

  const financeTrend = Array.from(dayMap.entries()).map(([date, values]) => ({
    date,
    income: values.income,
    expense: values.expense,
    net: values.income - values.expense,
  }));

  const income14 = financeTrend.reduce((sum, d) => sum + d.income, 0);
  const expense14 = financeTrend.reduce((sum, d) => sum + d.expense, 0);
  const net14 = income14 - expense14;
  const shopifyIncome14 = (recentFinances ?? [])
    .filter((tx) => tx.type === "income" && (tx.source ?? "").toLowerCase().includes("shopify"))
    .reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0);

  const fmtCop = (value: number) =>
    new Intl.NumberFormat(financeLocale, {
      style: "currency",
      currency: financeCurrency,
      maximumFractionDigits: 0,
      useGrouping: financeUseGrouping,
    }).format(value);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-muted-foreground text-sm capitalize">{displayDate}</p>
          <h2 className="text-2xl font-bold mt-0.5">Buenos días 👋</h2>
        </div>
        <ActionButtons />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Finance Chart */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold">Finanzas (14 días)</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-2">
                <p className="text-muted-foreground">Ingresos</p>
                <p className="text-green-300 font-semibold mt-0.5">{fmtCop(income14)}</p>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2">
                <p className="text-muted-foreground">Gastos</p>
                <p className="text-red-300 font-semibold mt-0.5">{fmtCop(expense14)}</p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-2">
                <p className="text-muted-foreground">Shopify</p>
                <p className="text-cyan-300 font-semibold mt-0.5">{fmtCop(shopifyIncome14)}</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 mb-3">
              <p className="text-xs text-muted-foreground">Balance neto</p>
              <p className={`text-lg font-bold ${net14 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {net14 >= 0 ? "+" : ""}{fmtCop(net14)}
              </p>
            </div>
            <FinanceTrendChart data={financeTrend} />
          </div>

          {/* Tasks from Notion */}
          <NotionTasks />

          {/* Habits from Supabase — interactive */}
          <DashboardHabits initialHabits={dailyHabits} initialLogs={todayLogs} today={today} />
        </div>

        {/* Side Panel */}
        <div className="space-y-5">
          {/* Projects from Notion */}
          <NotionProjects />

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
                Completa tareas y hábitos para que la IA genere insights personalizados.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
