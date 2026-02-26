import { createClient } from "@/lib/supabase/server";
import { FinancesClient } from "./FinancesClient";

export default async function FinancesPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from("finances")
      .select("*, finance_categories(name, icon, color)")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("finance_categories")
      .select("*")
      .order("name"),
    supabase
      .from("profiles")
      .select("preferences")
      .single(),
  ]);

  const preferences = (profile?.preferences ?? {}) as {
    finance_currency?: string;
    finance_locale?: string;
    finance_use_grouping?: boolean;
    goal_daily_spend_limit?: number;
  };

  return (
    <FinancesClient
      initialTransactions={transactions ?? []}
      categories={categories ?? []}
      financePreferences={{
        currency: preferences.finance_currency ?? "COP",
        locale: preferences.finance_locale ?? "es-CO",
        useGrouping: preferences.finance_use_grouping ?? true,
        dailySpendLimit: preferences.goal_daily_spend_limit ?? 0,
      }}
    />
  );
}
