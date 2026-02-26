import { createClient } from "@/lib/supabase/server";
import { MetricsClient } from "./MetricsClient";

export default async function MetricsPage() {
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("metric_date", { ascending: false })
    .limit(30);

  return <MetricsClient initialHistory={history ?? []} />;
}
