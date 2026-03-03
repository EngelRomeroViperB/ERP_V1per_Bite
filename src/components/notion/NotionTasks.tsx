"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    fetch("/api/notion/query-tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

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
          {tasks.slice(0, 8).map((task) => (
            <a
              key={task.id}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
            >
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
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
