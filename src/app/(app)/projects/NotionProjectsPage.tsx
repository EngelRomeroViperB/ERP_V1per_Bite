"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FolderKanban, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Project = {
  id: string;
  nombre: string;
  status: string;
  deadline: string | null;
  tareas: number;
  priority: string;
  url: string;
};

const STATUS_COLOR: Record<string, string> = {
  "En curso": "bg-blue-500/10 text-blue-400",
  "Not started": "bg-gray-500/10 text-gray-400",
  "Completado": "bg-green-500/10 text-green-400",
  "Pausado": "bg-yellow-500/10 text-yellow-400",
};

export function NotionProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/notion/query-projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const statuses = [...new Set(projects.map((p) => p.status).filter(Boolean))];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Proyectos</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${filtered.length} proyectos`}
        </p>
      </div>

      {statuses.length > 0 && (
        <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
          <button onClick={() => setFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Todos</button>
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{s}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderKanban className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay proyectos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.nombre}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.status && <span className={cn("text-xs px-2 py-0.5 rounded-md", STATUS_COLOR[p.status] ?? "bg-secondary text-muted-foreground")}>{p.status}</span>}
                    {p.priority && <span className="text-xs text-muted-foreground">{p.priority}</span>}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {p.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.deadline + "T00:00:00"), "d MMM yyyy", { locale: es })}
                  </span>
                )}
                {p.tareas > 0 && <span>{p.tareas} tareas</span>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
