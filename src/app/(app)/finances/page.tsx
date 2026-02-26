import { createClient } from "@/lib/supabase/server";
import { FinancesClient } from "./FinancesClient";

export default async function FinancesPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("finances")
      .select("*, finance_categories(name, icon, color)")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("finance_categories")
      .select("*")
      .order("name"),
  ]);

  return (
    <FinancesClient
      initialTransactions={transactions ?? []}
      categories={categories ?? []}
    />
  );
}
