"use client";

import { useState, useEffect } from "react";
import { FolderOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  nombre: string;
  status: string;
  priority: string;
  deadline: string | null;
  tareasCount: number;
  url: string;
};

const STATUS_COLORS: Record<string, string> = {
  "En progreso": "bg-blue-500/10 text-blue-400",
  "En Progreso": "bg-blue-500/10 text-blue-400",
  "Activo": "bg-green-500/10 text-green-400",
  "Pausado": "bg-yellow-500/10 text-yellow-400",
  "Por hacer": "bg-secondary text-muted-foreground",
};

export function NotionProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notion/query-projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-4 h-4 text-violet-400" />
        <h3 className="font-semibold text-sm">Proyectos recientes</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin proyectos activos
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium flex-1 truncate">{project.nombre}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {project.status && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-md",
                      STATUS_COLORS[project.status] ?? "bg-secondary text-muted-foreground"
                    )}
                  >
                    {project.status}
                  </span>
                )}
                {project.tareasCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {project.tareasCount} tarea{project.tareasCount > 1 ? "s" : ""}
                  </span>
                )}
                {project.deadline && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(project.deadline).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
