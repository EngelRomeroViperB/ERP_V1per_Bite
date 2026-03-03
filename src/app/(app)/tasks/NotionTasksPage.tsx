"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CheckSquare, ExternalLink, Check, Loader2, Circle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Task = {
  id: string;
  nombre: string;
  prioridad: string;
  esfuerzo: string;
  status: string;
  fecha: string | null;
  url: string;
};

const PRIORITY_BADGE: Record<string, string> = {
  "Alta": "bg-red-500/10 text-red-400",
  "Media": "bg-yellow-500/10 text-yellow-400",
  "Baja": "bg-blue-500/10 text-blue-400",
  "🔴 Alta": "bg-red-500/10 text-red-400",
  "🟡 Media": "bg-yellow-500/10 text-yellow-400",
  "🔵 Baja": "bg-blue-500/10 text-blue-400",
};

const STATUS_COLOR: Record<string, string> = {
  "Not started": "text-muted-foreground",
  "In progress": "text-yellow-400",
  "Done": "text-green-400",
};

export function NotionTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    fetch("/api/notion/query-tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filterStatus === "active") list = list.filter((t) => t.status !== "Done");
    else if (filterStatus === "done") list = list.filter((t) => t.status === "Done");
    if (filterPriority !== "all") list = list.filter((t) => t.prioridad.includes(filterPriority));
    return list;
  }, [tasks, filterStatus, filterPriority]);

  async function completeTask(taskId: string) {
    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch("/api/notion/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: taskId, property: "Status", value: "Done", type: "status" }),
      });
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch { /* ignore */ }
    finally {
      setCompleting((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tareas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {loading ? "Cargando..." : `${filtered.length} tareas visibles`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {[["active", "Activas"], ["all", "Todas"], ["done", "Completadas"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterStatus === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {[["all", "Todas"], ["Alta", "Alta"], ["Media", "Media"], ["Baja", "Baja"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPriority(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterPriority === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckSquare className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay tareas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isOverdue = task.fecha && task.fecha < today && task.status !== "Done";
            const isCompleting = completing.has(task.id);
            return (
              <div key={task.id} className={cn("glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-all group", task.status === "Done" && "opacity-50")}>
                <button onClick={() => completeTask(task.id)} disabled={isCompleting} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all", isCompleting ? "bg-green-500 border-green-500 text-white" : "border-border hover:border-primary hover:bg-primary/10")}>
                  {isCompleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", task.status === "Done" && "line-through text-muted-foreground")}>{task.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.status && (
                      <span className={cn("text-xs", STATUS_COLOR[task.status] ?? "text-muted-foreground")}>
                        <Circle className="w-2 h-2 inline mr-1" />{task.status}
                      </span>
                    )}
                    {task.fecha && (
                      <span className={cn("text-xs", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                        {format(new Date(task.fecha + "T00:00:00"), "d MMM", { locale: es })}
                      </span>
                    )}
                    {task.esfuerzo && (
                      <span className="text-xs text-muted-foreground">⚡ {task.esfuerzo}</span>
                    )}
                  </div>
                </div>

                {task.prioridad && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0", PRIORITY_BADGE[task.prioridad] ?? "bg-secondary text-muted-foreground")}>{task.prioridad}</span>
                )}

                <a href={task.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
