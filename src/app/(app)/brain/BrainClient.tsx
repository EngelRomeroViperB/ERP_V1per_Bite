"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, Brain, Search, Code2, FileText, Link2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Note = {
  id: string;
  title: string;
  content: string;
  type: "snippet" | "note" | "resource";
  language: string | null;
  tags: string[];
  area_id: string | null;
  updated_at: string;
};
type Area = { id: string; name: string; color: string | null; icon: string | null };

const TYPE_META = {
  note:     { icon: <FileText className="w-3.5 h-3.5" />, label: "Nota",    color: "bg-blue-500/10 text-blue-400" },
  snippet:  { icon: <Code2    className="w-3.5 h-3.5" />, label: "Snippet", color: "bg-purple-500/10 text-purple-400" },
  resource: { icon: <Link2    className="w-3.5 h-3.5" />, label: "Recurso", color: "bg-amber-500/10 text-amber-400" },
};

const LANGS = ["typescript","javascript","python","sql","bash","css","json","markdown","rust","go","java"];

interface BrainClientProps {
  initialNotes: Note[];
  areas: Area[];
}

export function BrainClient({ initialNotes, areas }: BrainClientProps) {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "note" | "snippet" | "resource">("all");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "",
    type: "note" as "note" | "snippet" | "resource",
    language: "typescript", area_id: "", tags: "",
  });

  const filtered = useMemo(() => {
    let list = notes;
    if (filterType !== "all") list = list.filter((n) => n.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [notes, filterType, search]);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { data } = await supabase
      .from("brain_notes")
      .insert({
        user_id: user.id,
        title: form.title,
        content: form.content,
        type: form.type,
        language: form.type === "snippet" ? form.language : null,
        area_id: form.area_id || null,
        tags,
      })
      .select()
      .single();

    if (data) setNotes((prev) => [data as Note, ...prev]);
    setLoading(false);
    resetForm();
  }

  async function deleteNote(id: string) {
    await supabase.from("brain_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  }

  function resetForm() {
    setShowForm(false);
    setForm({ title: "", content: "", type: "note", language: "typescript", area_id: "", tags: "" });
  }

  return (
    <div className="space-y-5 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold">Brain</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{notes.length} elementos guardados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en Brain..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {(["all","note","snippet","resource"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "Todo" : TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nuevo elemento</h3>
            <button onClick={resetForm} className="p-1 hover:bg-accent rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
          {/* Type selector */}
          <div className="flex gap-2">
            {(["note","snippet","resource"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm((p) => ({ ...p, type: t }))}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                  form.type === t ? "bg-primary/10 text-primary border-primary/30" : "border-border hover:bg-accent"
                )}
              >
                {TYPE_META[t].icon}
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <input
            type="text" value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Título" autoFocus
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          {form.type === "snippet" && (
            <select
              value={form.language}
              onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder={form.type === "snippet" ? "Pega tu código aquí..." : form.type === "resource" ? "URL o descripción del recurso..." : "Escribe tu nota..."}
            rows={6}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none",
              form.type === "snippet" && "font-mono text-xs"
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={form.area_id}
              onChange={(e) => setForm((p) => ({ ...p, area_id: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Sin área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
            <input
              type="text" value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="Tags separados por coma"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={loading || !form.title.trim() || !form.content.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Main grid: list + detail */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* List */}
        <div className={cn("flex flex-col gap-2 overflow-y-auto", activeNote ? "w-80 flex-shrink-0" : "flex-1")}>
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Brain className="w-12 h-12 text-cyan-400/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                {search ? "No se encontraron resultados." : "Tu base de conocimiento está vacía."}
              </p>
            </div>
          ) : (
            filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNote(activeNote?.id === note.id ? null : note)}
                className={cn(
                  "glass rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-all w-full",
                  activeNote?.id === note.id && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5", TYPE_META[note.type].color)}>
                    {TYPE_META[note.type].icon}
                    {note.language ?? TYPE_META[note.type].label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{note.content.slice(0, 60)}</p>
                  </div>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  {format(new Date(note.updated_at), "d MMM", { locale: es })}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {activeNote && (
          <div className="flex-1 glass rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-md w-fit mb-2", TYPE_META[activeNote.type].color)}>
                  {TYPE_META[activeNote.type].icon}
                  {activeNote.language ?? TYPE_META[activeNote.type].label}
                </span>
                <h3 className="font-semibold text-lg">{activeNote.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actualizado {format(new Date(activeNote.updated_at), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <button
                onClick={() => deleteNote(activeNote.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <pre className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl p-4",
              activeNote.type === "snippet" ? "bg-secondary font-mono text-xs" : ""
            )}>
              {activeNote.content}
            </pre>
            {activeNote.tags.length > 0 && (
              <div className="flex gap-1.5 mt-4 flex-wrap">
                {activeNote.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded-lg text-muted-foreground">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
