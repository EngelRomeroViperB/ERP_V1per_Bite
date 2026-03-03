import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryNotionDatabase } from "@/lib/notion";
import { NOTION_DATABASES } from "@/lib/notion-databases";

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
      return NextResponse.json({ error: "Notion not connected", projects: [] }, { status: 200 });
    }

    const result = await queryNotionDatabase(
      token,
      NOTION_DATABASES.PROYECTOS,
      {
        property: "Status",
        select: { does_not_equal: "Completado" },
      },
      [{ property: "Deadline", direction: "ascending" }],
      4
    );

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const projects = (result.results ?? []).map((page: any) => {
      const props = page.properties ?? {};
      const nombre = props["Nombre"]?.title?.[0]?.plain_text ?? "Sin título";
      const status = props["Status"]?.select?.name ?? "";
      const priority = props["Priority Score"]?.select?.name ?? "";
      const deadline = props["Deadline"]?.date?.start ?? null;
      const tareasCount = props["Tareas"]?.relation?.length ?? 0;
      return {
        id: page.id,
        nombre,
        status,
        priority,
        deadline,
        tareasCount,
        url: page.url,
      };
    });

    return NextResponse.json({ projects });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion query-projects error:", msg);
    return NextResponse.json({ error: msg, projects: [] }, { status: 200 });
  }
}
