import { createClient } from "@/lib/supabase/server";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: areas }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, areas(name, color, icon)")
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("id, name, color, icon").order("order_index"),
  ]);

  return <ProjectsClient initialProjects={projects ?? []} areas={areas ?? []} />;
}
