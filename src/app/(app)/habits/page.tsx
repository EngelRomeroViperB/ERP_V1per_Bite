import { createClient } from "@/lib/supabase/server";
import { HabitsClient } from "./HabitsClient";
import { format, subDays } from "date-fns";

export default async function HabitsPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const since = format(subDays(new Date(), 27), "yyyy-MM-dd");

  const [{ data: habits }, { data: todayLogs }, { data: recentLogs }] = await Promise.all([
    supabase.from("habits").select("*").order("created_at"),
    supabase.from("habit_logs").select("*").eq("log_date", today),
    supabase.from("habit_logs").select("habit_id, log_date, completed")
      .gte("log_date", since).lte("log_date", today).eq("completed", true),
  ]);

  return (
    <HabitsClient
      initialHabits={habits ?? []}
      todayLogs={todayLogs ?? []}
      recentLogs={recentLogs ?? []}
      today={today}
    />
  );
}
