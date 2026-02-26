"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Send, Sparkles, Bot, User, Loader2, MessageSquare, AlertTriangle } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "¿Cuál debería ser mi foco de hoy?",
  "Analiza mi productividad esta semana",
  "Sugiere 3 hábitos para mejorar mi energía",
  "¿Cómo puedo mejorar mi rutina matutina?",
];

export function NlpClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hola 👋 Soy tu asistente IA personal. Puedo ayudarte a analizar tu productividad, sugerir mejoras, procesar tus metas y brindarte insights sobre tus datos. ¿En qué te puedo ayudar hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contingencyMode, setContingencyMode] = useState(false);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error del servidor");
      const replyText = String(data.reply ?? "");
      const fallbackDetected =
        replyText.includes("modo contingencia") ||
        replyText.includes("no tiene cuota disponible") ||
        replyText.includes("GEMINI_API_KEY no está configurada");

      if (fallbackDetected) {
        setContingencyMode(true);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Assistant</h2>
            <p className="text-muted-foreground text-xs">Powered by Google Gemini</p>
          </div>
        </div>

        {contingencyMode && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Modo contingencia activo: Gemini sin cuota/configuración. Respuestas en modo local.
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 flex-shrink-0">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="glass rounded-xl px-4 py-3 text-sm text-left hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                msg.role === "assistant"
                  ? "bg-purple-500/20"
                  : "bg-primary/20"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "assistant"
                  ? "glass"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <div className="flex gap-2 glass rounded-2xl p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <MessageSquare className="w-3 h-3" />
          La IA puede cometer errores. Verifica información importante.
        </p>
      </div>
    </div>
  );
}
