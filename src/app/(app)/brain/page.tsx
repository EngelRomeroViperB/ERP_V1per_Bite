import { createClient } from "@/lib/supabase/server";
import { BrainClient } from "./BrainClient";

export default async function BrainPage() {
  const supabase = await createClient();

  const [{ data: notes }, { data: areas }] = await Promise.all([
    supabase
      .from("brain_notes")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase.from("areas").select("id, name, color, icon").order("order_index"),
  ]);

  return <BrainClient initialNotes={notes ?? []} areas={areas ?? []} />;
}
