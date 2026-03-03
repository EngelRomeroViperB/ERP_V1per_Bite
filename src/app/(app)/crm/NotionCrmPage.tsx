"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, ExternalLink, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Contact = {
  id: string;
  nombre: string;
  rol: string;
  frecuencia: string;
  contexto: string;
  ultimoContacto: string | null;
  url: string;
};

export function NotionCrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: "CRM",
        sorts: [{ property: "Ultimo Contacto", direction: "descending" }],
        page_size: 100,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = (d.results ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.properties?.["Nombre"]?.title?.[0]?.plain_text ?? "Sin nombre",
          rol: p.properties?.["Rol"]?.select?.name ?? "",
          frecuencia: p.properties?.["Frecuencia"]?.select?.name ?? "",
          contexto: p.properties?.["Contexto"]?.rich_text?.[0]?.plain_text ?? "",
          ultimoContacto: p.properties?.["Ultimo Contacto"]?.date?.start ?? null,
          url: p.url,
        }));
        setContacts(mapped);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    return contacts.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.rol.toLowerCase().includes(search.toLowerCase()));
  }, [contacts, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">CRM</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${filtered.length} contactos`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contactos..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay contactos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {c.rol && <span className="text-xs text-muted-foreground">{c.rol}</span>}
                    {c.frecuencia && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{c.frecuencia}</span>}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              {c.ultimoContacto && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(c.ultimoContacto + "T00:00:00"), "d MMM yyyy", { locale: es })}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
