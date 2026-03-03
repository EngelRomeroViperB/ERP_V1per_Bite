import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Sparkles,
} from "lucide-react";
import { ActionButtons } from "@/components/notion/ActionButtons";
import { NotionTasks } from "@/components/notion/NotionTasks";
import { NotionProjects } from "@/components/notion/NotionProjects";
import { DashboardHabits } from "./DashboardHabits";
import { DashboardFinance } from "./DashboardFinance";

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

  const shopifyFinances = (recentFinances ?? []).map((tx) => ({
    transaction_date: tx.transaction_date as string,
    amount: Number(tx.amount ?? 0),
    type: tx.type as string,
    source: (tx.source ?? "") as string,
  }));

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
          {/* Finance Chart — Notion + Shopify with toggle */}
          <DashboardFinance
            shopifyFinances={shopifyFinances}
            currency={financeCurrency}
            locale={financeLocale}
            useGrouping={financeUseGrouping}
          />

          {/* Tasks from Notion */}
          <NotionTasks />
        </div>

        {/* Side Panel */}
        <div className="space-y-5">
          {/* Projects from Notion */}
          <NotionProjects />

          {/* Habits from Supabase — interactive */}
          <DashboardHabits initialHabits={dailyHabits} initialLogs={todayLogs} today={today} />

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
