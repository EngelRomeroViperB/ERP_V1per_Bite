"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, CheckSquare, Circle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "P1" | "P2" | "P3";
  status: "todo" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  completed_at: string | null;
  project_id: string | null;
  area_id: string | null;
  projects: { title: string } | null;
  areas: { name: string; color: string | null } | null;
};

type Project = { id: string; title: string };
type Area = { id: string; name: string; color: string | null; icon: string | null };

const PRIORITY_META = {
  P1: { label: "P1 — Urgente",    dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400" },
  P2: { label: "P2 — Normal",     dot: "bg-yellow-500", badge: "bg-yellow-500/10 text-yellow-400" },
  P3: { label: "P3 — Bajo",       dot: "bg-blue-500",   badge: "bg-blue-500/10 text-blue-400" },
};

const STATUS_ICONS = {
  todo:        <Circle className="w-4 h-4 text-muted-foreground" />,
  in_progress: <Clock  className="w-4 h-4 text-yellow-400" />,
  done:        <Check  className="w-4 h-4 text-green-400" />,
  cancelled:   <X      className="w-4 h-4 text-red-400" />,
};

interface TasksClientProps {
  initialTasks: Task[];
  projects: Project[];
  areas: Area[];
}

export function TasksClient({ initialTasks, projects, areas }: TasksClientProps) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "", description: "", priority: "P2" as "P1" | "P2" | "P3",
    due_date: "", project_id: "", area_id: "",
  });

  const filtered = useMemo(() => {
    let list = tasks;
    if (filterStatus === "active") list = list.filter((t) => t.status === "todo" || t.status === "in_progress");
    else if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);
    return list;
  }, [tasks, filterStatus, filterPriority]);

  async function handleCreate() {
    if (!formData.title.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        project_id: formData.project_id || null,
        area_id: formData.area_id || null,
      })
      .select("*, projects(title), areas(name, color)")
      .single();

    if (data) setTasks((prev) => [data as unknown as Task, ...prev]);
    setLoading(false);
    resetForm();
  }

  async function toggleStatus(task: Task) {
    const next = task.status === "todo" ? "in_progress"
      : task.status === "in_progress" ? "done"
      : task.status === "done" ? "todo"
      : task.status;

    const { data } = await supabase
      .from("tasks")
      .update({ status: next })
      .eq("id", task.id)
      .select("*, projects(title), areas(name, color)")
      .single();

    if (data) setTasks((prev) => prev.map((t) => t.id === task.id ? data as unknown as Task : t));
  }

  function resetForm() {
    setShowForm(false);
    setFormData({ title: "", description: "", priority: "P2", due_date: "", project_id: "", area_id: "" });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tareas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} tareas visibles
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {[["active", "Activas"], ["all", "Todas"], ["done", "Completadas"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterStatus === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >{l}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {[["all", "Todas"], ["P1", "P1"], ["P2", "P2"], ["P3", "P3"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterPriority(v)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterPriority === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >{l}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nueva tarea</h3>
            <button onClick={resetForm} className="p-1 hover:bg-accent rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="Título de la tarea"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              value={formData.priority}
              onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as "P1" | "P2" | "P3" }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="P1">P1 — Urgente</option>
              <option value="P2">P2 — Normal</option>
              <option value="P3">P3 — Bajo</option>
            </select>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <select
              value={formData.project_id}
              onChange={(e) => setFormData((p) => ({ ...p, project_id: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select
              value={formData.area_id}
              onChange={(e) => setFormData((p) => ({ ...p, area_id: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Sin área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
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
              Crear tarea
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckSquare className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay tareas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isOverdue = task.due_date && task.due_date < today && task.status !== "done";
            return (
              <div
                key={task.id}
                className={cn(
                  "glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-all",
                  task.status === "done" && "opacity-50"
                )}
              >
                <button
                  onClick={() => toggleStatus(task)}
                  className="flex-shrink-0 transition-transform hover:scale-110"
                  title="Cambiar estado"
                >
                  {STATUS_ICONS[task.status]}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.projects && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        📁 {task.projects.title}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={cn("text-xs flex items-center gap-0.5", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        {format(new Date(task.due_date + "T00:00:00"), "d MMM", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>

                <span className={cn("text-xs px-2 py-0.5 rounded-md font-mono flex-shrink-0", PRIORITY_META[task.priority]?.badge)}>
                  {task.priority}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
