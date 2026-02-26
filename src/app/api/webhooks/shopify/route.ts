import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyShopifyHmac(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export async function POST(req: NextRequest) {
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";

  const rawBody = await req.text();

  if (!verifyShopifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();

  await supabase.from("webhook_logs").insert({
    source: `shopify:${shopDomain}`,
    payload,
    status: "received",
  });

  if (topic === "orders/create" || topic === "orders/paid") {
    const order = payload as {
      id?: number;
      order_number?: number;
      total_price?: string;
      currency?: string;
      email?: string;
      created_at?: string;
      financial_status?: string;
    };

    const amount = parseFloat(order.total_price ?? "0");
    if (amount > 0) {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: category } = await supabase
        .from("finance_categories")
        .select("id")
        .eq("name", "Shopify")
        .maybeSingle();

      const insertData = {
        ...(user?.id ? { user_id: user.id } : {}),
        title: `Orden Shopify #${order.order_number ?? order.id}`,
        amount,
        type: "income" as const,
        source: shopDomain,
        transaction_date: order.created_at
          ? order.created_at.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        is_shopify: true,
        shopify_meta: {
          order_id: order.id,
          order_number: order.order_number,
          currency: order.currency,
          email: order.email,
          financial_status: order.financial_status,
        },
        ...(category?.id ? { category_id: category.id } : {}),
      };

      await supabase.from("finances").insert(insertData);

      await supabase
        .from("webhook_logs")
        .update({ status: "processed" })
        .eq("source", `shopify:${shopDomain}`)
        .eq("status", "received");
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
