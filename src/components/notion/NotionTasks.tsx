"use client";

import { useState, useEffect, useRef } from "react";
import { CheckSquare, ExternalLink, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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

const PRIORITY_COLORS: Record<string, string> = {
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

export function NotionTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);

  useEffect(() => {
    fetch("/api/notion/query-tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));

    fetch(`/api/notion/select-options?database_id=${NOTION_DATABASES.TAREAS}`)
      .then((r) => r.json())
      .then((d) => {
        const opts = d.options?.["Status"] ?? [];
        setStatusOptions(opts);
      })
      .catch(() => {});
  }, []);

  async function updateStatus(taskId: string, newStatus: string) {
    try {
      const res = await fetch("/api/notion/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: taskId, property: "Status", value: newStatus, type: "status" }),
      });
      if (res.ok) {
        if (newStatus === "Listo") {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } else {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
        }
      }
    } catch { /* ignore */ }
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
            const deadline = getDeadlineBadge(task.fecha);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <StatusDropdown
                  taskId={task.id}
                  currentStatus={task.status}
                  options={statusOptions}
                  onUpdate={updateStatus}
                />
                <span className="text-sm flex-1 truncate">{task.nombre}</span>
                {deadline && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5", deadline.color)}>
                    <Clock className="w-2.5 h-2.5" />
                    {deadline.text}
                  </span>
                )}
                {task.prioridad && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PRIORITY_COLORS[task.prioridad] ?? "bg-secondary text-muted-foreground")}>
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
