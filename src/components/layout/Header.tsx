"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Plus, Zap, X, CheckCheck, Menu, Mic, MicOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ isFinal?: boolean; 0?: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title = "Dashboard", onMenuClick }: HeaderProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [captureText, setCaptureText] = useState("");
  const [captureStatus, setCaptureStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [captureLabel, setCaptureLabel] = useState("Guardado");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(recognition));
  }, []);

  useEffect(() => {
    if (!showQuickCapture && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [showQuickCapture]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function handleVoiceInput() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "es-ES";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal === false) continue;
        transcript += result[0]?.transcript ?? "";
      }
      setCaptureText((prev) => `${prev}${prev ? " " : ""}${transcript.trim()}`.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function handleQuickCapture() {
    if (!captureText.trim() || captureStatus === "saving") return;
    setCaptureStatus("saving");
    try {
      const res = await fetch("/api/ai/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: captureText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setCaptureLabel(data.label ?? "Guardado");
      setCaptureStatus("ok");
      setTimeout(() => {
        setShowQuickCapture(false);
        setCaptureText("");
        setCaptureStatus("idle");
        setCaptureLabel("Guardado");
      }, 1400);
    } catch {
      setCaptureStatus("err");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "ahora";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-semibold flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowQuickCapture(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Captura rápida</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar leídas
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Sin notificaciones
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-accent/50 transition-colors ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${!n.is_read ? "font-semibold" : ""}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {!n.is_read && (
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {showQuickCapture && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4"
          onClick={() => setShowQuickCapture(false)}
        >
          <div
            className="glass rounded-2xl p-5 md:p-6 w-full max-w-lg max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Captura rápida</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Escribe en lenguaje natural — el sistema lo clasifica automáticamente.
            </p>
            <textarea
              autoFocus
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleQuickCapture()}
              placeholder='Ej: "Mañana entregar informe de estadística" o "Pesé 74.5kg hoy"'
              className="w-full h-28 px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Tip: puedes dictar con el micrófono y luego procesar con IA.
              </p>
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    isListening
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isListening ? "Detener" : "Dictar"}
                </button>
              )}
            </div>
            {captureStatus === "err" && (
              <p className="text-xs text-red-400 mt-2">Error al guardar. Inténtalo de nuevo.</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowQuickCapture(false); setCaptureText(""); setCaptureStatus("idle"); }}
                className="px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickCapture}
                disabled={!captureText.trim() || captureStatus === "saving" || captureStatus === "ok"}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {captureStatus === "saving" ? "Clasificando..." : captureStatus === "ok" ? `✓ ${captureLabel}` : "Procesar con IA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
