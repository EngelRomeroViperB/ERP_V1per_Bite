import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listDatabases, getDatabaseSchema } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
    const token = typeof prefs.notion_access_token === "string" ? prefs.notion_access_token : null;

    if (!token) {
      return NextResponse.json({ error: "Notion not connected", connected: false }, { status: 400 });
    }

    const databases = await listDatabases(token);

    const results = await Promise.all(
      databases.map(async (db) => {
        if (!("title" in db) || !("id" in db)) return null;
        try {
          const schema = await getDatabaseSchema(token, db.id);
          const title = "title" in schema
            ? (schema.title as Array<{ plain_text: string }>).map((t) => t.plain_text).join("")
            : "Sin título";
          const properties = "properties" in schema
            ? Object.entries(schema.properties as Record<string, { type: string; id: string }>).map(
                ([name, prop]) => ({ name, type: prop.type, id: prop.id })
              )
            : [];
          return { id: db.id, title, properties };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      connected: true,
      workspace: prefs.notion_workspace_name ?? "",
      databases: results.filter(Boolean),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
