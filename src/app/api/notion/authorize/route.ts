import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotionAuthUrl } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"));
    }

    const authUrl = getNotionAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
