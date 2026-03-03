"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/notion-databases";

interface NotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  databaseId: string;
  fields: FieldConfig[];
}

type SelectOption = { name: string; color: string };
type OptionsMap = Record<string, SelectOption[]>;

const NOTION_COLORS: Record<string, string> = {
  default: "bg-zinc-500/20 text-zinc-300",
  gray: "bg-zinc-500/20 text-zinc-300",
  brown: "bg-amber-800/20 text-amber-400",
  orange: "bg-orange-500/20 text-orange-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  green: "bg-green-500/20 text-green-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  pink: "bg-pink-500/20 text-pink-400",
  red: "bg-red-500/20 text-red-400",
};

function SelectDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.name === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary border border-border hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
      >
        {selected ? (
          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", NOTION_COLORS[selected.color] || NOTION_COLORS.default)}>
            {selected.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-popover border border-border shadow-lg py-1 max-h-48 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            Sin valor
          </button>
          {options.map((opt) => (
            <button
              key={opt.name}
              type="button"
              onClick={() => { onChange(opt.name); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2",
                value === opt.name && "bg-accent"
              )}
            >
              <span className={cn("px-2 py-0.5 rounded-md font-medium", NOTION_COLORS[opt.color] || NOTION_COLORS.default)}>
                {opt.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type RelationPage = { id: string; title: string };
type RelationMap = Record<string, RelationPage[]>;

function buildNotionProperties(
  fields: FieldConfig[],
  values: Record<string, string>
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.property]?.trim();
    if (!value) continue;

    switch (field.type) {
      case "title":
        properties[field.property === "title" ? field.name : field.property] = {
          title: [{ text: { content: value } }],
        };
        break;
      case "number":
        properties[field.property] = {
          number: parseFloat(value) || 0,
        };
        break;
      case "date":
        properties[field.property] = {
          date: { start: value },
        };
        break;
      case "select":
        properties[field.property] = {
          select: { name: value },
        };
        break;
      case "status":
        properties[field.property] = {
          status: { name: value },
        };
        break;
      case "url":
        properties[field.property] = {
          url: value,
        };
        break;
      case "relation":
        properties[field.property] = {
          relation: [{ id: value }],
        };
        break;
    }
  }

  return properties;
}

function RelationDropdown({
  pages,
  value,
  onChange,
  placeholder,
}: {
  pages: RelationPage[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = pages.find((p) => p.id === value);
  const filtered = search.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : pages;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary border border-border hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
      >
        {selected ? (
          <span className="text-sm truncate">{selected.title}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-popover border border-border shadow-lg py-1 max-h-52 overflow-y-auto">
          <div className="px-2 py-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs focus:outline-none"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            Sin valor
          </button>
          {filtered.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => { onChange(page.id); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors truncate",
                value === page.id && "bg-accent"
              )}
            >
              {page.title}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}

export function NotionFormModal({
  isOpen,
  onClose,
  title,
  icon,
  databaseId,
  fields,
}: NotionFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectOptions, setSelectOptions] = useState<OptionsMap>({});
  const [relationPages, setRelationPages] = useState<RelationMap>({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  const fetchOptions = useCallback(async () => {
    const hasDropdownFields = fields.some((f) => f.type === "select" || f.type === "status");
    if (hasDropdownFields) {
      setLoadingOptions(true);
      try {
        const res = await fetch(`/api/notion/select-options?database_id=${databaseId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectOptions(data.options ?? {});
        }
      } catch { /* ignore */ }
      finally { setLoadingOptions(false); }
    }

    const relationFields = fields.filter((f) => f.type === "relation" && f.relationDatabase);
    const uniqueDbs = [...new Set(relationFields.map((f) => f.relationDatabase!))];
    const newRelPages: RelationMap = {};

    await Promise.all(
      uniqueDbs.map(async (dbId) => {
        try {
          const res = await fetch("/api/notion/query-database", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ database_id: dbId, page_size: 100 }),
          });
          if (res.ok) {
            const data = await res.json();
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const pages: RelationPage[] = (data.results ?? []).map((p: any) => {
              const props = p.properties ?? {};
              const titleProp = Object.values(props).find((v: any) => v.type === "title") as any;
              const t = titleProp?.title?.[0]?.plain_text ?? "Sin título";
              return { id: p.id, title: t };
            });
            for (const f of relationFields) {
              if (f.relationDatabase === dbId) newRelPages[f.property] = pages;
            }
          }
        } catch { /* ignore */ }
      })
    );
    setRelationPages((prev) => ({ ...prev, ...newRelPages }));
  }, [databaseId, fields]);

  useEffect(() => {
    if (isOpen) fetchOptions();
  }, [isOpen, fetchOptions]);

  function handleChange(property: string, value: string) {
    setValues((prev) => ({ ...prev, [property]: value }));
  }

  async function handleSubmit() {
    const requiredFields = fields.filter((f) => f.required);
    for (const f of requiredFields) {
      if (!values[f.property]?.trim()) {
        setErrorMsg(`"${f.name}" es requerido`);
        setFormStatus("error");
        return;
      }
    }

    setFormStatus("saving");
    setErrorMsg("");

    try {
      const properties = buildNotionProperties(fields, values);
      const res = await fetch("/api/notion/create-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database_id: databaseId, properties }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      setFormStatus("ok");
      setTimeout(() => {
        onClose();
        setValues({});
        setFormStatus("idle");
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setFormStatus("error");
    }
  }

  function handleClose() {
    onClose();
    setValues({});
    setFormStatus("idle");
    setErrorMsg("");
  }

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4"
      onClick={handleClose}
    >
      <div
        className="glass rounded-2xl p-5 md:p-6 w-full max-w-lg max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => {
            const options = selectOptions[field.property] ?? selectOptions[field.name] ?? [];
            const relPages = relationPages[field.property] ?? [];

            return (
              <div key={field.property}>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {field.name}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {field.type === "title" || field.type === "url" ? (
                  <input
                    type={field.type === "url" ? "url" : "text"}
                    value={values[field.property] ?? ""}
                    onChange={(e) => handleChange(field.property, e.target.value)}
                    placeholder={field.type === "url" ? "https://..." : `${field.name}...`}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={values[field.property] ?? ""}
                    onChange={(e) => handleChange(field.property, e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    value={values[field.property] ?? new Date().toISOString().split("T")[0]}
                    onChange={(e) => handleChange(field.property, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                ) : field.type === "select" || field.type === "status" ? (
                  loadingOptions ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando opciones...
                    </div>
                  ) : options.length > 0 ? (
                    <SelectDropdown
                      options={options}
                      value={values[field.property] ?? ""}
                      onChange={(v) => handleChange(field.property, v)}
                      placeholder={`Seleccionar ${field.name.toLowerCase()}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.property] ?? ""}
                      onChange={(e) => handleChange(field.property, e.target.value)}
                      placeholder={`${field.name}...`}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  )
                ) : field.type === "relation" ? (
                  relPages.length > 0 ? (
                    <RelationDropdown
                      pages={relPages}
                      value={values[field.property] ?? ""}
                      onChange={(v) => handleChange(field.property, v)}
                      placeholder={`Seleccionar ${field.name.toLowerCase()}...`}
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>

        {formStatus === "error" && errorMsg && (
          <p className="text-xs text-red-400 mt-3">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={formStatus === "saving" || formStatus === "ok"}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60",
              formStatus === "ok"
                ? "bg-green-500/20 text-green-400"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {formStatus === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : formStatus === "ok" ? (
              <>
                <Check className="w-4 h-4" />
                Guardado
              </>
            ) : (
              "Guardar en Notion"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
