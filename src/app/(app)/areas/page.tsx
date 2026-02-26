import { createClient } from "@/lib/supabase/server";
import { AreasClient } from "./AreasClient";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("areas")
    .select("*")
    .is("parent_id", null)
    .order("order_index", { ascending: true });

  return <AreasClient initialAreas={areas ?? []} />;
}
