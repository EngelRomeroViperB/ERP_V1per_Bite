import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const subscription = body?.subscription ?? null;
    const enabled = Boolean(body?.enabled);

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences =
      profile && typeof profile.preferences === "object" && profile.preferences !== null
        ? (profile.preferences as Record<string, unknown>)
        : {};

    const nextPreferences = {
      ...currentPreferences,
      push_notifications_enabled: enabled,
      push_subscription: enabled ? subscription : null,
      push_last_updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update({ preferences: nextPreferences })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
