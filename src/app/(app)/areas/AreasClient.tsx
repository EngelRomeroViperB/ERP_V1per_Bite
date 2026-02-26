"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Check, Layers } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Area = Database["public"]["Tables"]["areas"]["Row"];

const COLORS = [
  "#6366F1", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
  "#F97316", "#84CC16",
];

const ICONS = ["🎓", "💪", "🏃", "🧠", "💰", "💻", "📚", "🏥", "🎯", "🔬", "🎨", "🏗️", "📊", "🌱", "⚡"];

interface AreasClientProps {
  initialAreas: Area[];
}

export function AreasClient({ initialAreas }: AreasClientProps) {
  const supabase = createClient();
  const [areas, setAreas] = useState<Area[]>(initialAreas);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "🎯", color: "#6366F1" });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!formData.name.trim()) return;
    setLoading(true);

    if (editingId) {
      const { data } = await supabase
        .from("areas")
        .update({ name: formData.name, icon: formData.icon, color: formData.color })
        .eq("id", editingId)
        .select()
        .single();
      if (data) setAreas((prev) => prev.map((a) => (a.id === editingId ? data : a)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("areas")
        .insert({
          user_id: user.id,
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          order_index: areas.length,
        })
        .select()
        .single();
      if (data) setAreas((prev) => [...prev, data]);
    }

    setLoading(false);
    resetForm();
  }

  async function handleDelete(id: string) {
    await supabase.from("areas").delete().eq("id", id);
    setAreas((prev) => prev.filter((a) => a.id !== id));
  }

  function startEdit(area: Area) {
    setEditingId(area.id);
    setFormData({ name: area.name, icon: area.icon ?? "🎯", color: area.color ?? "#6366F1" });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", icon: "🎯", color: "#6366F1" });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Áreas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Organiza tu vida en áreas de enfoque
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva área
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingId ? "Editar área" : "Nueva área"}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-accent rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nombre del área"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setFormData((p) => ({ ...p, icon }))}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    formData.icon === icon
                      ? "ring-2 ring-primary bg-primary/10"
                      : "hover:bg-accent"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData((p) => ({ ...p, color }))}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    formData.color === color && "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {editingId ? "Guardar cambios" : "Crear área"}
            </button>
          </div>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Layers className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            No tienes áreas creadas. Crea tu primera área de enfoque.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {areas.map((area) => (
            <div
              key={area.id}
              className="glass rounded-2xl p-5 group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: (area.color ?? "#6366F1") + "20" }}
                >
                  {area.icon ?? "🎯"}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(area)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(area.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold">{area.name}</h3>
              <div
                className="mt-2 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: area.color ?? "#6366F1" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
