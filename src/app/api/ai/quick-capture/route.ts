import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_API_VERSION,
  getGeminiModelCandidates,
  isGeminiQuotaError,
} from "@/lib/gemini";

export const runtime = "nodejs";

const CLASSIFY_PROMPT = `Analiza el siguiente texto en español y clasifícalo. Responde SOLO con JSON válido, sin markdown ni explicaciones.

Categorías posibles:
- "task": tarea, pendiente, recordatorio de acción futura
- "habit": petición para crear o definir hábitos/rutinas
- "metric": dato personal (peso, sueño, energía, estado de ánimo, calorías)
- "finance": gasto, ingreso, pago, compra
- "note": cualquier otra cosa

Para "task": { "type": "task", "title": string, "priority": "p1"|"p2"|"p3"|"p4" }
Para "habit": { "type": "habit", "habit_names": string[] }
Para "metric": { "type": "metric", "weight_kg"?: number, "sleep_hours"?: number, "mood"?: number (1-5), "energy"?: number (1-5), "kcal"?: number }
Para "finance": { "type": "finance", "amount": number, "transaction_type": "expense"|"income", "description": string }
Para "note": { "type": "note", "title": string, "content": string }

Texto: `;

type CaptureResult = {
  type: "task" | "habit" | "metric" | "finance" | "note";
  title?: string;
  content?: string;
  habit_names?: string[];
  priority?: string;
  weight_kg?: number;
  sleep_hours?: number;
  mood?: number;
  energy?: number;
  kcal?: number;
  amount?: number;
  transaction_type?: "expense" | "income";
  description?: string;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function extractFirstNumber(text: string): number | undefined {
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return undefined;
  return toNumber(match[1]);
}

function extractHabitNames(inputText: string) {
  const cleaned = inputText
    .replace(/\r/g, "\n")
    .replace(/[•·]/g, "-")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((line) => line.replace(/^[-\d.)\s]+/, "").trim())
    .filter(Boolean);

  const source = lines.length > 1 ? lines : cleaned.split(/,|;|\sy\s/gi).map((v) => v.trim()).filter(Boolean);
  const candidates = source
    .map((item) => item.replace(/^crear\s+/i, "").replace(/^h[áa]bitos?\s*/i, "").trim())
    .filter((item) => item.length >= 3)
    .slice(0, 6);

  if (candidates.length > 0) return candidates;

  return [
    "Hidratación diaria (2L)",
    "Movimiento 30 minutos",
    "Plan de día (10 min)",
  ];
}

function inferHabitIcon(name: string) {
  const text = name.toLowerCase();
  if (/(agua|hidrat)/.test(text)) return "💧";
  if (/(leer|lectura|libro)/.test(text)) return "📚";
  if (/(medit|respira|mindfulness)/.test(text)) return "🧘";
  if (/(ejercicio|camin|correr|gym|movimiento)/.test(text)) return "🏃";
  if (/(dormir|sueño|descanso)/.test(text)) return "🛌";
  if (/(plan|agenda|organiza)/.test(text)) return "🎯";
  return "✅";
}

function normalizeCaptureResult(raw: unknown, inputText: string): CaptureResult {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawType = typeof obj.type === "string" ? obj.type.toLowerCase() : "note";
  const type: CaptureResult["type"] =
    rawType === "task" || rawType === "habit" || rawType === "metric" || rawType === "finance" ? rawType : "note";

  const habitNames = Array.isArray(obj.habit_names)
    ? obj.habit_names
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

  return {
    type,
    title: typeof obj.title === "string" ? obj.title : inputText.slice(0, 100),
    content: typeof obj.content === "string" ? obj.content : inputText,
    habit_names: habitNames,
    priority: typeof obj.priority === "string" ? obj.priority : undefined,
    weight_kg: toNumber(obj.weight_kg),
    sleep_hours: toNumber(obj.sleep_hours),
    mood: toNumber(obj.mood),
    energy: toNumber(obj.energy),
    kcal: toNumber(obj.kcal),
    amount: toNumber(obj.amount),
    transaction_type: obj.transaction_type === "income" ? "income" : "expense",
    description: typeof obj.description === "string" ? obj.description : inputText.slice(0, 100),
  };
}

function normalizeTaskPriority(priority?: string) {
  const value = (priority ?? "").toUpperCase();
  if (value === "P1" || value === "P2" || value === "P3") return value;
  return "P3";
}

function classifyLocally(inputText: string): CaptureResult {
  const text = inputText.toLowerCase();

  if (/(h[áa]bito|rutina|ritual)/.test(text) && /(crear|agrega|sugier|necesito|quiero|define|plan)/.test(text)) {
    return {
      type: "habit",
      habit_names: extractHabitNames(inputText),
    };
  }

  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos)/);
  if (weightMatch) {
    return {
      type: "metric",
      weight_kg: toNumber(weightMatch[1]),
    };
  }

  const isExpense = /(gast|pagu|compr|costo|costó|egres|debit)/.test(text);
  const isIncome = /(ingres|cobr|vend|abono|deposit|depósito)/.test(text);
  if (isExpense || isIncome) {
    return {
      type: "finance",
      amount: extractFirstNumber(inputText),
      transaction_type: isIncome ? "income" : "expense",
      description: inputText.slice(0, 100),
    };
  }

  if (/(mañana|pendiente|recordar|debo|tengo que|hacer|entregar|llamar)/.test(text)) {
    return {
      type: "task",
      title: inputText.slice(0, 100),
      priority: "P2",
    };
  }

  return {
    type: "note",
    title: inputText.slice(0, 80),
    content: inputText,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();
    const preferences = (profile?.preferences ?? {}) as Record<string, unknown>;
    const preferredPriorityRaw = typeof preferences.quick_capture_default_priority === "string"
      ? preferences.quick_capture_default_priority
      : "P3";
    const preferredPriority = normalizeTaskPriority(preferredPriorityRaw);
    const autoTags = Array.isArray(preferences.quick_capture_auto_tags)
      ? preferences.quick_capture_auto_tags
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const body = await req.json();
    const text: unknown = body?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: "Texto demasiado largo (máx. 500 caracteres)" }, { status: 400 });
    }

    const inputText = text.trim();
    let parsed: CaptureResult;
    let usedFallback = false;

    if (!process.env.GEMINI_API_KEY) {
      parsed = classifyLocally(inputText);
      usedFallback = true;
    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const modelCandidates = getGeminiModelCandidates();
      let aiParsed: CaptureResult | null = null;
      let lastModelError = "";
      let quotaDetected = false;

      for (const modelName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel(
            { model: modelName },
            { apiVersion: GEMINI_API_VERSION }
          );
          const result = await model.generateContent(CLASSIFY_PROMPT + `"${inputText}"`);
          const raw = result.response.text().trim();
          const jsonStr = raw
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          aiParsed = normalizeCaptureResult(JSON.parse(jsonStr), inputText);
          break;
        } catch (modelError) {
          const msg = modelError instanceof Error ? modelError.message : String(modelError);
          lastModelError = msg;
          if (isGeminiQuotaError(msg)) quotaDetected = true;
        }
      }

      if (!aiParsed) {
        if (lastModelError) {
          console.error("Quick capture AI fallback:", lastModelError);
        }
        parsed = classifyLocally(inputText);
        usedFallback = true;
        if (quotaDetected) {
          // Preserve UX: save data even when Gemini has no quota.
          // The response includes usedFallback=true so UI can adapt if needed.
        }
      } else {
        parsed = aiParsed;
      }
    }

    let label = "Nota en Brain";

    let savedType: CaptureResult["type"] = parsed.type;

    if (parsed.type === "task") {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: parsed.title ?? inputText.slice(0, 100),
        priority: normalizeTaskPriority(parsed.priority ?? preferredPriority),
        status: "todo",
      });
      if (error) throw error;
      label = "Tarea creada";
    } else if (parsed.type === "habit") {
      const requestedHabits = (parsed.habit_names ?? extractHabitNames(inputText)).slice(0, 8);
      const { data: existingHabits } = await supabase
        .from("habits")
        .select("name")
        .eq("user_id", user.id);

      const existing = new Set((existingHabits ?? []).map((h) => h.name.toLowerCase().trim()));
      const toInsert = requestedHabits
        .map((name: string) => name.trim())
        .filter((name: string) => name.length > 2 && !existing.has(name.toLowerCase()))
        .slice(0, 6)
        .map((name: string) => ({
          user_id: user.id,
          name,
          icon: inferHabitIcon(name),
          frequency: "daily",
          target_streak: 30,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("habits").insert(toInsert);
        if (error) throw error;
        label = `${toInsert.length} hábito${toInsert.length > 1 ? "s" : ""} creado${toInsert.length > 1 ? "s" : ""}`;
      } else {
        label = "Hábitos ya existentes";
      }
    } else if (parsed.type === "metric") {
      const today = new Date().toISOString().split("T")[0];
      const metricData: Record<string, unknown> = { user_id: user.id, metric_date: today };
      if (typeof parsed.weight_kg === "number") metricData.weight_kg = parsed.weight_kg;
      if (typeof parsed.sleep_hours === "number") metricData.sleep_hours = parsed.sleep_hours;
      if (typeof parsed.mood === "number") metricData.mood_score = clamp(Math.round(parsed.mood * 2), 1, 10);
      if (typeof parsed.energy === "number") metricData.energy_level = clamp(Math.round(parsed.energy * 2), 1, 10);
      if (typeof parsed.kcal === "number") metricData.calories_kcal = Math.max(0, Math.round(parsed.kcal));
      if (Object.keys(metricData).length === 2) {
        metricData.journal_entry = inputText;
      }
      const { error } = await supabase
        .from("daily_metrics")
        .upsert(metricData, { onConflict: "user_id,metric_date" });
      if (error) throw error;
      label = "Métrica guardada";
    } else if (parsed.type === "finance") {
      const today = new Date().toISOString().split("T")[0];
      const amount = Math.abs(parsed.amount ?? extractFirstNumber(inputText) ?? 0);
      if (amount > 0) {
        const txType = parsed.transaction_type === "income" ? "income" : "expense";
        const { error } = await supabase.from("finances").insert({
          user_id: user.id,
          title: parsed.description ?? inputText.slice(0, 100),
          amount,
          type: txType,
          transaction_date: today,
        });
        if (error) throw error;
        label = txType === "income" ? "Ingreso registrado" : "Gasto registrado";
      } else {
        const { error } = await supabase.from("brain_notes").insert({
          user_id: user.id,
          title: inputText.slice(0, 80),
          content: inputText,
          type: "note",
          tags: autoTags,
        });
        if (error) throw error;
        savedType = "note";
        label = "Nota en Brain";
      }
    } else {
      const { error } = await supabase.from("brain_notes").insert({
        user_id: user.id,
        title: parsed.title ?? inputText.slice(0, 80),
        content: parsed.content ?? inputText,
        type: "note",
        tags: autoTags,
      });
      if (error) throw error;
      label = "Nota en Brain";
    }

    return NextResponse.json({ type: savedType, label, saved: true, usedFallback });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Quick capture error:", errMsg);
    return NextResponse.json({ error: `Error: ${errMsg}` }, { status: 500 });
  }
}
