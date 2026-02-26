import { createClient } from "@/lib/supabase/server";
import { CrmClient } from "./CrmClient";

export default async function CrmPage() {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("crm_contacts")
    .select("*")
    .order("name");

  return <CrmClient initialContacts={contacts ?? []} />;
}
