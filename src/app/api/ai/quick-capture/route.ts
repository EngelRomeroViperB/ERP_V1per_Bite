import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const CLASSIFY_PROMPT = `Analiza el siguiente texto en español y clasifícalo. Responde SOLO con JSON válido, sin markdown ni explicaciones.

Categorías posibles:
- "task": tarea, pendiente, recordatorio de acción futura
- "metric": dato personal (peso, sueño, energía, estado de ánimo, calorías)
- "finance": gasto, ingreso, pago, compra
- "note": cualquier otra cosa

Para "task": { "type": "task", "title": string, "priority": "p1"|"p2"|"p3"|"p4" }
Para "metric": { "type": "metric", "weight_kg"?: number, "sleep_hours"?: number, "mood"?: number (1-5), "energy"?: number (1-5), "kcal"?: number }
Para "finance": { "type": "finance", "amount": number, "transaction_type": "expense"|"income", "description": string }
Para "note": { "type": "note", "title": string, "content": string }

Texto: `;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const text: unknown = body?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: "Texto demasiado largo (máx. 500 caracteres)" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback: save as brain note
      await supabase.from("brain_notes").insert({
        user_id: user.id,
        title: text.trim().slice(0, 80),
        content: text.trim(),
        type: "note",
        tags: [],
      });
      return NextResponse.json({ type: "note", label: "Nota en Brain", saved: true });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.0-flash" },
      { apiVersion: "v1beta" }
    );

    const result = await model.generateContent(CLASSIFY_PROMPT + `"${text.trim()}"`);
    const raw = result.response.text().trim();

    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    let label = "Nota en Brain";

    if (parsed.type === "task") {
      await supabase.from("tasks").insert({
        user_id: user.id,
        title: parsed.title ?? text.trim().slice(0, 100),
        priority: parsed.priority ?? "p3",
        status: "todo",
      });
      label = "Tarea creada";
    } else if (parsed.type === "metric") {
      const today = new Date().toISOString().split("T")[0];
      const metricData: Record<string, unknown> = { user_id: user.id, metric_date: today };
      if (parsed.weight_kg) metricData.weight_kg = parsed.weight_kg;
      if (parsed.sleep_hours) metricData.sleep_hours = parsed.sleep_hours;
      if (parsed.mood) metricData.mood = Math.min(5, Math.max(1, Math.round(parsed.mood)));
      if (parsed.energy) metricData.energy = Math.min(5, Math.max(1, Math.round(parsed.energy)));
      if (parsed.kcal) metricData.kcal = parsed.kcal;
      await supabase.from("daily_metrics").upsert(metricData, { onConflict: "user_id,metric_date" });
      label = "Métrica guardada";
    } else if (parsed.type === "finance") {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("finances").insert({
        user_id: user.id,
        amount: Math.abs(Number(parsed.amount ?? 0)),
        type: parsed.transaction_type === "income" ? "income" : "expense",
        description: parsed.description ?? text.trim().slice(0, 100),
        transaction_date: today,
      });
      label = parsed.transaction_type === "income" ? "Ingreso registrado" : "Gasto registrado";
    } else {
      await supabase.from("brain_notes").insert({
        user_id: user.id,
        title: parsed.title ?? text.trim().slice(0, 80),
        content: parsed.content ?? text.trim(),
        type: "note",
        tags: [],
      });
      label = "Nota en Brain";
    }

    return NextResponse.json({ type: parsed.type, label, saved: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Quick capture error:", errMsg);
    return NextResponse.json({ error: `Error: ${errMsg}` }, { status: 500 });
  }
}
