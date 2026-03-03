"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Layers, ExternalLink } from "lucide-react";

type Area = { id: string; nombre: string; tipo: string; url: string };

export function NotionAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ database: "AREAS", page_size: 50 }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = (d.results ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.properties?.["Nombre"]?.title?.[0]?.plain_text ?? "Sin título",
          tipo: p.properties?.["Seleccionar"]?.select?.name ?? "",
          url: p.url,
        }));
        setAreas(mapped);
      })
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Áreas</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${areas.length} áreas`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Layers className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay áreas configuradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{a.nombre}</p>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {a.tipo && <span className={cn("text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground mt-2 inline-block")}>{a.tipo}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
