import { createClient } from "@/lib/supabase/server";
import { SkillsClient } from "./SkillsClient";

export default async function SkillsPage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("skill_nodes").select("*").order("created_at"),
    supabase.from("skill_edges").select("*"),
  ]);

  return <SkillsClient initialNodes={nodes ?? []} initialEdges={edges ?? []} />;
}
