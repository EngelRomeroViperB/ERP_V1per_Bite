"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, FolderKanban, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

type Area = { id: string; name: string; color: string | null; icon: string | null };
type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  completion_pct: number;
  area_id: string | null;
  areas: Area | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "Activo",     color: "bg-blue-500/10 text-blue-400" },
  paused:    { label: "Pausado",    color: "bg-yellow-500/10 text-yellow-400" },
  completed: { label: "Completado", color: "bg-green-500/10 text-green-400" },
  cancelled: { label: "Cancelado",  color: "bg-red-500/10 text-red-400" },
};

interface ProjectsClientProps {
  initialProjects: Project[];
  areas: Area[];
}

export function ProjectsClient({ initialProjects, areas }: ProjectsClientProps) {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "", description: "", area_id: "", start_date: "", end_date: "",
  });

  const filtered = filter === "all"
    ? projects
    : projects.filter((p) => p.status === filter);

  async function handleCreate() {
    if (!formData.title.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        area_id: formData.area_id || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      })
      .select("*, areas(name, color, icon)")
      .single();

    if (data) setProjects((prev) => [data as Project, ...prev]);
    setLoading(false);
    resetForm();
  }

  function resetForm() {
    setShowForm(false);
    setFormData({ title: "", description: "", area_id: "", start_date: "", end_date: "" });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proyectos</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{projects.length} proyectos en total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "active", "paused", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s]?.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nuevo proyecto</h3>
            <button onClick={resetForm} className="p-1 hover:bg-accent rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="Título del proyecto"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={formData.area_id}
              onChange={(e) => setFormData((p) => ({ ...p, area_id: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !formData.title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Crear proyecto
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderKanban className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay proyectos {filter !== "all" ? `con estado "${STATUS_LABELS[filter]?.label}"` : "aún"}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="glass rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{project.title}</h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-lg flex-shrink-0", STATUS_LABELS[project.status]?.color)}>
                  {STATUS_LABELS[project.status]?.label}
                </span>
              </div>

              {project.areas && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{project.areas.icon}</span>
                  <span className="text-xs text-muted-foreground">{project.areas.name}</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{project.completion_pct}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${project.completion_pct}%` }}
                  />
                </div>
              </div>

              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {project.start_date ?? "—"} → {project.end_date ?? "—"}
                  </span>
                </div>
              )}

              <Link
                href={`/projects/${project.id}`}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-auto"
              >
                <ExternalLink className="w-3 h-3" />
                Ver tareas
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
