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
      return NextResponse.json({ error: "Notion not connected", tasks: [] }, { status: 200 });
    }

    const result = await queryNotionDatabase(
      token,
      NOTION_DATABASES.TAREAS,
      {
        and: [
          { property: "Status", status: { does_not_equal: "Done" } },
        ],
      },
      [{ property: "Fecha (Hacer)", direction: "ascending" }],
      15
    );

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const tasks = (result.results ?? []).map((page: any) => {
      const props = page.properties ?? {};
      const nombre = props["Nombre"]?.title?.[0]?.plain_text ?? "Sin título";
      const prioridad = props["Prioridad"]?.select?.name ?? "";
      const esfuerzo = props["Esfuerzo"]?.select?.name ?? "";
      const status = props["Status"]?.status?.name ?? "";
      const fecha = props["Fecha (Hacer)"]?.date?.start ?? null;
      return {
        id: page.id,
        nombre,
        prioridad,
        esfuerzo,
        status,
        fecha,
        url: page.url,
      };
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Notion query-tasks error:", msg);
    return NextResponse.json({ error: msg, tasks: [] }, { status: 200 });
  }
}
