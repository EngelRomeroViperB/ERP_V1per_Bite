import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryNotionDatabase } from "@/lib/notion";
import { NOTION_DATABASES, NotionDatabaseKey } from "@/lib/notion-databases";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Notion not connected", results: [] });
    }

    const body = await req.json();
    const dbKey = body.database as NotionDatabaseKey | undefined;
    const dbId = dbKey ? NOTION_DATABASES[dbKey] : (body.database_id as string | undefined);

    if (!dbId) {
      return NextResponse.json({ error: "Missing database" }, { status: 400 });
    }

    const result = await queryNotionDatabase(
      token,
      dbId,
      body.filter ?? undefined,
      body.sorts ?? undefined,
      body.page_size ?? 50
    );

    return NextResponse.json({ results: result.results ?? [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion query-database error:", msg);
    return NextResponse.json({ error: msg, results: [] });
  }
}
