import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDatabaseSchema } from "@/lib/notion";

export const runtime = "nodejs";

/**
 * GET /api/notion/select-options?database_id=xxx
 * Returns a map of property_name → string[] of select/multi_select options.
 */
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }

    const databaseId = req.nextUrl.searchParams.get("database_id");
    if (!databaseId) {
      return NextResponse.json({ error: "database_id is required" }, { status: 400 });
    }

    const schema = await getDatabaseSchema(token, databaseId);
    const properties = schema.properties as Record<string, { type: string; select?: { options: { name: string; color: string }[] }; multi_select?: { options: { name: string; color: string }[] }; status?: { options: { name: string; color: string }[] } }>;

    const optionsMap: Record<string, { name: string; color: string }[]> = {};

    for (const [name, prop] of Object.entries(properties)) {
      if (prop.type === "select" && prop.select?.options) {
        optionsMap[name] = prop.select.options.map((o) => ({ name: o.name, color: o.color }));
      } else if (prop.type === "multi_select" && prop.multi_select?.options) {
        optionsMap[name] = prop.multi_select.options.map((o) => ({ name: o.name, color: o.color }));
      } else if (prop.type === "status" && prop.status?.options) {
        optionsMap[name] = prop.status.options.map((o) => ({ name: o.name, color: o.color }));
      }
    }

    return NextResponse.json({ options: optionsMap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion select-options error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
