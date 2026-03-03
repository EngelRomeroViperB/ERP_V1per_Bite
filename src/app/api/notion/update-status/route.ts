import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/**
 * PATCH /api/notion/update-status
 * Body: { page_id, property, value, type? }
 * Updates a single property on a Notion page.
 * Supports: select, status, checkbox, date, number
 */
export async function PATCH(req: NextRequest) {
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
    const { page_id, property, value, type = "status" } = body;

    if (!page_id || !property) {
      return NextResponse.json({ error: "page_id and property are required" }, { status: 400 });
    }

    let propertyValue: unknown;
    switch (type) {
      case "select":
        propertyValue = { select: value ? { name: value } : null };
        break;
      case "status":
        propertyValue = { status: { name: value } };
        break;
      case "checkbox":
        propertyValue = { checkbox: Boolean(value) };
        break;
      default:
        propertyValue = { [type]: value };
    }

    const response = await fetch(`${NOTION_API}/pages/${page_id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { [property]: propertyValue },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Notion update failed: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, page_id: data.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion update-status error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
