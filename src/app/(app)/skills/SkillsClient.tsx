"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, GitBranch } from "lucide-react";

type SkillNode = {
  id: string;
  name: string;
  category: string | null;
  status: "pending" | "learning" | "mastered";
  mastery_level: number;
  description: string | null;
};
type SkillEdge = { id: string; source_id: string; target_id: string; relationship: string };

const STATUS_META = {
  pending:  { label: "Pendiente", color: "bg-secondary text-muted-foreground", ring: "ring-border" },
  learning: { label: "Aprendiendo", color: "bg-yellow-500/10 text-yellow-400", ring: "ring-yellow-500/40" },
  mastered: { label: "Dominado", color: "bg-green-500/10 text-green-400", ring: "ring-green-500/40" },
};

interface SkillsClientProps {
  initialNodes: SkillNode[];
  initialEdges: SkillEdge[];
}

export function SkillsClient({ initialNodes, initialEdges }: SkillsClientProps) {
  const supabase = createClient();
  const [nodes, setNodes] = useState<SkillNode[]>(initialNodes);
  const edgeCount = initialEdges.length;
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | SkillNode["status"]>("all");
  const [form, setForm] = useState({
    name: "", category: "", description: "",
    status: "pending" as SkillNode["status"], mastery_level: 0,
  });

  const categories = [...new Set(nodes.map((n) => n.category).filter(Boolean))] as string[];

  const grouped = nodes
    .filter((n) => filterStatus === "all" || n.status === filterStatus)
    .reduce((acc, n) => {
      const cat = n.category ?? "Sin categoría";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(n);
      return acc;
    }, {} as Record<string, SkillNode[]>);

  async function handleCreate() {
    if (!form.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("skill_nodes")
      .insert({
        user_id: user.id,
        name: form.name,
        category: form.category || null,
        description: form.description || null,
        status: form.status,
        mastery_level: form.mastery_level,
        x_pos: Math.random() * 400,
        y_pos: Math.random() * 400,
      })
      .select()
      .single();

    if (data) setNodes((prev) => [...prev, data as SkillNode]);
    setShowForm(false);
    setForm({ name: "", category: "", description: "", status: "pending", mastery_level: 0 });
  }

  async function cycleStatus(node: SkillNode) {
    const next: SkillNode["status"] =
      node.status === "pending" ? "learning"
      : node.status === "learning" ? "mastered"
      : "pending";

    const { data } = await supabase
      .from("skill_nodes")
      .update({ status: next, mastery_level: next === "mastered" ? 100 : next === "learning" ? 50 : 0 })
      .eq("id", node.id)
      .select()
      .single();

    if (data) setNodes((prev) => prev.map((n) => n.id === node.id ? data as SkillNode : n));
  }

  async function deleteNode(id: string) {
    await supabase.from("skill_nodes").delete().eq("id", id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }

  const mastered = nodes.filter((n) => n.status === "mastered").length;
  const learning = nodes.filter((n) => n.status === "learning").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skill Tree</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {mastered} dominadas · {learning} aprendiendo · {nodes.length} skills · {edgeCount} relaciones
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva skill
        </button>
      </div>

      {/* Progress bar */}
      {nodes.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="font-semibold">Progreso total</span>
            <span className="text-muted-foreground">{nodes.length > 0 ? Math.round((mastered / nodes.length) * 100) : 0}% dominado</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-green-500 rounded-full transition-all" style={{ width: `${(mastered / nodes.length) * 100}%` }} />
            <div className="bg-yellow-500 rounded-full transition-all" style={{ width: `${(learning / nodes.length) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Dominado ({mastered})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Aprendiendo ({learning})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block border border-border" /> Pendiente ({nodes.length - mastered - learning})</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {(["all", "pending", "learning", "mastered"] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            {s === "all" ? "Todas" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nueva skill</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-accent rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nombre de la skill" autoFocus
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="text" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Categoría (ej: Frontend, Backend)"
              list="categories-list"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <datalist id="categories-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Descripción (opcional)"
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          <div className="flex gap-2">
            {(["pending", "learning", "mastered"] as const).map((s) => (
              <button key={s} onClick={() => setForm((p) => ({ ...p, status: s }))}
                className={cn("flex-1 py-2 rounded-lg text-xs font-medium border transition-colors",
                  form.status === s ? STATUS_META[s].color + " border-transparent ring-1 " + STATUS_META[s].ring : "border-border hover:bg-accent"
                )}>{STATUS_META[s].label}</button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" />Guardar
            </button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <GitBranch className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Empieza a mapear tus habilidades y conocimientos.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catNodes]) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{cat}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {catNodes.map((node) => (
                <div key={node.id}
                  className={cn("glass rounded-xl p-4 group cursor-pointer hover:border-primary/30 transition-all ring-1", STATUS_META[node.status].ring)}
                  onClick={() => cycleStatus(node)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-tight">{node.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0"
                    ><X className="w-3 h-3" /></button>
                  </div>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-md mt-2 inline-block", STATUS_META[node.status].color)}>
                    {STATUS_META[node.status].label}
                  </span>
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",
                      node.status === "mastered" ? "bg-green-500" : node.status === "learning" ? "bg-yellow-500" : "bg-border"
                    )} style={{ width: `${node.mastery_level}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click para avanzar</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
