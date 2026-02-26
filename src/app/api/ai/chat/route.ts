import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_API_VERSION,
  getGeminiModelCandidates,
  isGeminiQuotaError,
} from "@/lib/gemini";

export const runtime = "nodejs";

function buildLocalFallbackReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("foco") || text.includes("prioridad") || text.includes("hoy")) {
    return [
      "Plan rápido para hoy:",
      "1) Elige 1 tarea P1 (máximo 90 min) y ejecútala primero.",
      "2) Define 2 tareas P2 cortas (15-30 min) para cerrar el día.",
      "3) Reserva 10 min al final para revisión y captura de pendientes.",
    ].join("\n");
  }

  if (text.includes("habito") || text.includes("hábito")) {
    return [
      "Sugerencia de hábitos (mínimo viable):",
      "- 5 min de movimiento al despertar",
      "- 2 bloques de foco de 25 min",
      "- Cierre del día: 3 líneas de diario + plan de mañana",
    ].join("\n");
  }

  if (text.includes("estres") || text.includes("estrés") || text.includes("ansiedad")) {
    return [
      "Protocolo corto de regulación:",
      "1) Respiración 4-4-6 por 2 minutos",
      "2) Divide tu pendiente principal en un primer paso de 5 minutos",
      "3) Empieza ese paso ahora y reevalúa en 10 minutos",
    ].join("\n");
  }

  return [
    "Estoy en modo contingencia (sin cuota de Gemini).",
    "Si quieres, te ayudo con este formato:",
    "- Objetivo de hoy",
    "- Bloque de tiempo disponible",
    "- Obstáculo principal",
    "Con eso te devuelvo un plan accionable.",
  ].join("\n");
}

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
    const message: unknown = body?.message;
    const history: unknown = body?.history;

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Mensaje demasiado largo (máx. 2000 caracteres)" }, { status: 400 });
    }
    if (!Array.isArray(history)) {
      return NextResponse.json({ error: "Historial inválido" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          reply: [
            "⚠️ La clave GEMINI_API_KEY no está configurada.",
            "",
            buildLocalFallbackReply(message),
          ].join("\n"),
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelCandidates = getGeminiModelCandidates();
    const systemPrompt = `Eres un asistente personal de productividad y bienestar para un sistema ERP personal llamado "ERP de Vida". 
Tu rol es ayudar al usuario a:
- Analizar su productividad y progreso en tareas y proyectos
- Sugerir mejoras en hábitos, rutinas y bienestar
- Proporcionar insights sobre sus métricas de salud (sueño, energía, mood)
- Ayudar con planificación y priorización
- Brindar apoyo motivacional y coaching

Responde siempre en español, de forma concisa y práctica. 
Sé directo y personalizado. Usa emojis con moderación.`;

    const chatHistory = (history as { role: string; content: string }[])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    let lastModelError = "";
    let quotaErrorDetected = false;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel(
          { model: modelName },
          { apiVersion: GEMINI_API_VERSION }
        );

        const chat = model.startChat({
          history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Entendido. Estoy listo para ayudarte con tu ERP de vida personal." }] },
            ...chatHistory,
          ],
        });

        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        if (reply.length > 100) {
          await supabase.from("ai_insights").insert({
            user_id: user.id,
            insight_type: "chat_insight",
            content: reply.slice(0, 500),
            data_snapshot: { user_message: message },
            confidence_score: 0.8,
          });
        }

        return NextResponse.json({ reply });
      } catch (modelError) {
        const msg = modelError instanceof Error ? modelError.message : String(modelError);
        lastModelError = msg;
        if (isGeminiQuotaError(msg)) {
          quotaErrorDetected = true;
        }
      }
    }

    if (quotaErrorDetected) {
      return NextResponse.json(
        {
          reply: [
            "⚠️ Tu API Key de Gemini no tiene cuota disponible ahora mismo.",
            "Activa billing en Google AI Studio o espera el reset de cuota para reactivar IA completa.",
            "",
            buildLocalFallbackReply(message),
          ].join("\n"),
        },
        { status: 200 }
      );
    }

    throw new Error(lastModelError || "No fue posible generar respuesta con ningún modelo de Gemini.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("AI chat error:", errMsg);
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${errMsg}` },
      { status: 500 }
    );
  }
}
