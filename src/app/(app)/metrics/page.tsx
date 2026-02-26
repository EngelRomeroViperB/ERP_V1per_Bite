import { createClient } from "@/lib/supabase/server";
import { MetricsClient } from "./MetricsClient";

export default async function MetricsPage() {
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("metric_date", { ascending: false })
    .limit(30);

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .single();

  const preferences = (profile?.preferences ?? {}) as {
    mood_labels?: string[];
    energy_labels?: string[];
  };

  return (
    <MetricsClient
      initialHistory={history ?? []}
      moodLabels={Array.isArray(preferences.mood_labels) ? preferences.mood_labels : []}
      energyLabels={Array.isArray(preferences.energy_labels) ? preferences.energy_labels : []}
    />
  );
}
