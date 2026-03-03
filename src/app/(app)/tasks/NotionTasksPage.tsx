"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckSquare, ExternalLink, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NOTION_DATABASES } from "@/lib/notion-databases";

type Task = {
  id: string;
  nombre: string;
  prioridad: string;
  esfuerzo: string;
  status: string;
  fecha: string | null;
  url: string;
};

type StatusOption = { name: string; color: string };

const PRIORITY_BADGE: Record<string, string> = {
  "Alta": "bg-red-500/10 text-red-400",
  "Media": "bg-yellow-500/10 text-yellow-400",
  "Baja": "bg-blue-500/10 text-blue-400",
  "🔴 Alta": "bg-red-500/10 text-red-400",
  "🟡 Media": "bg-yellow-500/10 text-yellow-400",
  "🔵 Baja": "bg-blue-500/10 text-blue-400",
};

const STATUS_DOT: Record<string, string> = {
  "Sin empezar": "bg-gray-400",
  "En curso": "bg-blue-400",
  "Bloqueado": "bg-red-400",
  "Listo": "bg-green-400",
};

function getDeadlineBadge(fecha: string | null): { text: string; color: string } | null {
  if (!fecha) return null;
  const now = new Date();
  const deadline = new Date(fecha + "T23:59:59");
  const diffMs = deadline.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffH / 24;

  if (diffMs < 0) return { text: "Vencida", color: "bg-red-500/20 text-red-400" };
  if (diffD < 1) return { text: "Hoy", color: "bg-orange-500/20 text-orange-400" };
  if (diffD < 2) return { text: "1d", color: "bg-yellow-500/20 text-yellow-400" };
  if (diffD < 7) return { text: `${Math.ceil(diffD)}d`, color: "bg-blue-500/10 text-blue-400" };
  return { text: `${Math.ceil(diffD)}d`, color: "bg-secondary text-muted-foreground" };
}

function StatusDropdown({
  taskId,
  currentStatus,
  options,
  onUpdate,
}: {
  taskId: string;
  currentStatus: string;
  options: StatusOption[];
  onUpdate: (taskId: string, newStatus: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const dotColor = STATUS_DOT[currentStatus] ?? "bg-gray-400";

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={updating}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          updating ? "border-primary bg-primary/20" : "border-border hover:border-primary"
        )}
        title={currentStatus || "Sin estado"}
      >
        {updating ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
        ) : (
          <div className={cn("w-2 h-2 rounded-full", dotColor)} />
        )}
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1 w-36 rounded-xl bg-popover border border-border shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.name}
              onClick={async () => {
                setOpen(false);
                setUpdating(true);
                await onUpdate(taskId, opt.name);
                setUpdating(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2",
                currentStatus === opt.name && "bg-accent"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[opt.name] ?? "bg-gray-400")} />
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotionTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    fetch("/api/notion/query-tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));

    fetch(`/api/notion/select-options?database_id=${NOTION_DATABASES.TAREAS}`)
      .then((r) => r.json())
      .then((d) => setStatusOptions(d.options?.["Status"] ?? []))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filterStatus === "active") list = list.filter((t) => t.status !== "Listo" && t.status !== "Done");
    else if (filterStatus === "done") list = list.filter((t) => t.status === "Listo" || t.status === "Done");
    if (filterPriority !== "all") list = list.filter((t) => t.prioridad.includes(filterPriority));
    return list;
  }, [tasks, filterStatus, filterPriority]);

  async function updateStatus(taskId: string, newStatus: string) {
    try {
      const res = await fetch("/api/notion/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: taskId, property: "Status", value: newStatus, type: "status" }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      }
    } catch { /* ignore */ }
  }

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
            const deadline = getDeadlineBadge(task.fecha);
            const isDone = task.status === "Listo" || task.status === "Done";
            return (
              <div key={task.id} className={cn("glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-all group", isDone && "opacity-50")}>
                <StatusDropdown
                  taskId={task.id}
                  currentStatus={task.status}
                  options={statusOptions}
                  onUpdate={updateStatus}
                />

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", isDone && "line-through text-muted-foreground")}>{task.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.status && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full inline-block", STATUS_DOT[task.status] ?? "bg-gray-400")} />
                        {task.status}
                      </span>
                    )}
                    {task.fecha && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.fecha + "T00:00:00"), "d MMM", { locale: es })}
                      </span>
                    )}
                    {task.esfuerzo && (
                      <span className="text-xs text-muted-foreground">⚡ {task.esfuerzo}</span>
                    )}
                  </div>
                </div>

                {deadline && !isDone && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5 flex-shrink-0", deadline.color)}>
                    <Clock className="w-2.5 h-2.5" />
                    {deadline.text}
                  </span>
                )}

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
