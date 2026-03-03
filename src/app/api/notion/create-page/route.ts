import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotionPage } from "@/lib/notion";

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
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }

    const body = await req.json();
    const { database_id, properties } = body;

    if (!database_id || !properties) {
      return NextResponse.json({ error: "database_id and properties are required" }, { status: 400 });
    }

    const page = await createNotionPage(token, database_id, properties);

    return NextResponse.json({ ok: true, page_id: page.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion create-page error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
