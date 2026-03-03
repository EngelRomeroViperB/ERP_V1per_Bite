import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      console.error("Notion OAuth error:", error);
      return NextResponse.redirect(new URL("/settings?notion=error", req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?notion=no_code", req.url));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const tokenData = await exchangeCodeForToken(code);

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
      notion_access_token: tokenData.access_token,
      notion_workspace_id: tokenData.workspace_id,
      notion_workspace_name: tokenData.workspace_name,
      notion_bot_id: tokenData.bot_id,
      notion_connected_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ preferences: nextPreferences })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to save Notion token:", updateError);
      return NextResponse.redirect(new URL("/settings?notion=save_error", req.url));
    }

    return NextResponse.redirect(new URL("/settings?notion=connected", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Notion OAuth callback error:", msg);
    return NextResponse.redirect(new URL("/settings?notion=error", req.url));
  }
}
