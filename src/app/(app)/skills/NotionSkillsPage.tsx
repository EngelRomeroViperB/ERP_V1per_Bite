"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { GitBranch, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Skill = {
  id: string;
  habilidad: string;
  categoria: string;
  nivel: string;
  ultimaRevision: string | null;
  url: string;
};

const NIVEL_COLOR: Record<string, string> = {
  "Principiante": "bg-blue-500/10 text-blue-400",
  "Intermedio": "bg-yellow-500/10 text-yellow-400",
  "Avanzado": "bg-green-500/10 text-green-400",
  "Experto": "bg-purple-500/10 text-purple-400",
};

export function NotionSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ database: "SKILL_TREE", page_size: 100 }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = (d.results ?? []).map((p: any) => ({
          id: p.id,
          habilidad: p.properties?.["Habilidad"]?.title?.[0]?.plain_text ?? "Sin título",
          categoria: p.properties?.["Categoria"]?.select?.name ?? "",
          nivel: p.properties?.["Nivel"]?.select?.name ?? "",
          ultimaRevision: p.properties?.["Ultima Revisión"]?.date?.start ?? null,
          url: p.url,
        }));
        setSkills(mapped);
      })
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, []);

  const categorias = useMemo(() => [...new Set(skills.map((s) => s.categoria).filter(Boolean))], [skills]);

  const filtered = useMemo(() => {
    let list = skills;
    if (filter !== "all") list = list.filter((s) => s.categoria === filter);
    if (search.trim()) list = list.filter((s) => s.habilidad.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [skills, filter, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Skills</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${filtered.length} habilidades`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar habilidades..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        </div>
        {categorias.length > 0 && (
          <div className="flex gap-1 bg-secondary rounded-xl p-1 flex-wrap">
            <button onClick={() => setFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Todas</button>
            {categorias.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <GitBranch className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay habilidades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.habilidad}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {s.categoria && <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{s.categoria}</span>}
                    {s.nivel && <span className={cn("text-xs px-2 py-0.5 rounded-md", NIVEL_COLOR[s.nivel] ?? "bg-secondary text-muted-foreground")}>{s.nivel}</span>}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
              {s.ultimaRevision && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última revisión: {format(new Date(s.ultimaRevision + "T00:00:00"), "d MMM yyyy", { locale: es })}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
