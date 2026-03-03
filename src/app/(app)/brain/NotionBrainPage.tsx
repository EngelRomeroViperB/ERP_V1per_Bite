"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Brain, ExternalLink, Link2, Search } from "lucide-react";

type Resource = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  urlProp: string;
  url: string;
};

export function NotionBrainPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ database: "BRAIN", page_size: 100 }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = (d.results ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.properties?.["Nombre"]?.title?.[0]?.plain_text ?? "Sin título",
          tipo: p.properties?.["Tipo"]?.select?.name ?? "",
          estado: p.properties?.["Estado"]?.select?.name ?? "",
          urlProp: p.properties?.["URL"]?.url ?? "",
          url: p.url,
        }));
        setResources(mapped);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  const tipos = useMemo(() => [...new Set(resources.map((r) => r.tipo).filter(Boolean))], [resources]);

  const filtered = useMemo(() => {
    let list = resources;
    if (filter !== "all") list = list.filter((r) => r.tipo === filter);
    if (search.trim()) list = list.filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [resources, filter, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Brain</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${filtered.length} recursos`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar recursos..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        </div>
        {tipos.length > 0 && (
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            <button onClick={() => setFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Todos</button>
            {tipos.map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Brain className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay recursos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.nombre}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {r.tipo && <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{r.tipo}</span>}
                    {r.estado && <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{r.estado}</span>}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
              {r.urlProp && (
                <div className="flex items-center gap-1 mt-2 text-xs text-primary/70 truncate">
                  <Link2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{r.urlProp}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
