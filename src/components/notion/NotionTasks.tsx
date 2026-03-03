"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ExternalLink, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  nombre: string;
  prioridad: string;
  esfuerzo: string;
  status: string;
  fecha: string | null;
  url: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  "Alta": "bg-red-500/10 text-red-400",
  "Media": "bg-yellow-500/10 text-yellow-400",
  "Baja": "bg-blue-500/10 text-blue-400",
  "🔴 Alta": "bg-red-500/10 text-red-400",
  "🟡 Media": "bg-yellow-500/10 text-yellow-400",
  "🔵 Baja": "bg-blue-500/10 text-blue-400",
};

const PRIORITY_DOTS: Record<string, string> = {
  "Alta": "bg-red-500",
  "Media": "bg-yellow-500",
  "Baja": "bg-blue-500",
  "🔴 Alta": "bg-red-500",
  "🟡 Media": "bg-yellow-500",
  "🔵 Baja": "bg-blue-500",
};

export function NotionTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/notion/query-tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  async function completeTask(taskId: string) {
    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch("/api/notion/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: taskId,
          property: "Status",
          value: "Done",
          type: "status",
        }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      // silently fail
    } finally {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Tareas pendientes</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "..." : `${tasks.length} pendientes`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Sin tareas pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 8).map((task) => {
            const isCompleting = completing.has(task.id);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={isCompleting}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isCompleting
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-border hover:border-primary hover:bg-primary/10"
                  )}
                >
                  {isCompleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                  )}
                </button>
                <div
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    PRIORITY_DOTS[task.prioridad] ?? "bg-gray-500"
                  )}
                />
                <span className="text-sm flex-1 truncate">{task.nombre}</span>
                {task.prioridad && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-md font-medium",
                      PRIORITY_COLORS[task.prioridad] ?? "bg-secondary text-muted-foreground"
                    )}
                  >
                    {task.prioridad}
                  </span>
                )}
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
