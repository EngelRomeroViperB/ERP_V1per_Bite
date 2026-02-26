import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return <SettingsClient initialProfile={profile} />;
}
