import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }, { data: areas }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(title), areas(name, color)")
      .neq("status", "cancelled")
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("projects").select("id, title").eq("status", "active").order("title"),
    supabase.from("areas").select("id, name, color, icon").order("order_index"),
  ]);

  return <TasksClient initialTasks={tasks ?? []} projects={projects ?? []} areas={areas ?? []} />;
}
