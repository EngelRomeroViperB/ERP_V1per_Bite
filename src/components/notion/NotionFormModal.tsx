"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldType = "title" | "number" | "date" | "select" | "url";

interface FieldConfig {
  name: string;
  property: string;
  type: FieldType;
  required: boolean;
}

interface NotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  databaseId: string;
  fields: readonly FieldConfig[];
}

function buildNotionProperties(
  fields: readonly FieldConfig[],
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
      case "url":
        properties[field.property] = {
          url: value,
        };
        break;
    }
  }

  return properties;
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
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(property: string, value: string) {
    setValues((prev) => ({ ...prev, [property]: value }));
  }

  async function handleSubmit() {
    const requiredFields = fields.filter((f) => f.required);
    for (const f of requiredFields) {
      if (!values[f.property]?.trim()) {
        setErrorMsg(`"${f.name}" es requerido`);
        setStatus("error");
        return;
      }
    }

    setStatus("saving");
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

      setStatus("ok");
      setTimeout(() => {
        onClose();
        setValues({});
        setStatus("idle");
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  }

  function handleClose() {
    onClose();
    setValues({});
    setStatus("idle");
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
          {fields.map((field) => (
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
              ) : field.type === "select" ? (
                <input
                  type="text"
                  value={values[field.property] ?? ""}
                  onChange={(e) => handleChange(field.property, e.target.value)}
                  placeholder={`${field.name}...`}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              ) : null}
            </div>
          ))}
        </div>

        {status === "error" && errorMsg && (
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
            disabled={status === "saving" || status === "ok"}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60",
              status === "ok"
                ? "bg-green-500/20 text-green-400"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {status === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : status === "ok" ? (
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
