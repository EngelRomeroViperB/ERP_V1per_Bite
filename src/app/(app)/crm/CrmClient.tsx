"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Plus, X, Check, Users, Star, Mail, Phone, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  relationship_type: string | null;
  trust_score: number;
  last_contact: string | null;
};

interface CrmClientProps {
  initialContacts: Contact[];
}

export function CrmClient({ initialContacts }: CrmClientProps) {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    relationship_type: "", trust_score: 7,
  });

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.relationship_type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!form.name.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("crm_contacts")
      .insert({
        user_id: user.id,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        relationship_type: form.relationship_type || null,
        trust_score: form.trust_score,
      })
      .select()
      .single();

    if (data) setContacts((prev) => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", company: "", relationship_type: "", trust_score: 7 });
  }

  async function deleteContact(id: string) {
    await supabase.from("crm_contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{contacts.length} contactos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo contacto
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, empresa, tipo..."
        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
      />

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nuevo contacto</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-accent rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nombre completo *" autoFocus
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Teléfono"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="text" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              placeholder="Empresa"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="text" value={form.relationship_type} onChange={(e) => setForm((p) => ({ ...p, relationship_type: e.target.value }))}
              placeholder="Tipo de relación (cliente, mentor, etc.)"
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground flex-shrink-0">Confianza:</span>
              <input type="range" min={1} max={10} value={form.trust_score}
                onChange={(e) => setForm((p) => ({ ...p, trust_score: parseInt(e.target.value) }))}
                className="flex-1" />
              <span className="text-sm font-semibold w-4">{form.trust_score}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={loading || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            {search ? "No se encontraron contactos." : "Añade tus primeros contactos al CRM."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 group hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => deleteContact(c.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="font-semibold text-sm">{c.name}</h3>
              {c.relationship_type && (
                <p className="text-xs text-primary/70 mt-0.5">{c.relationship_type}</p>
              )}
              <div className="mt-3 space-y-1.5">
                {c.company && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />{c.company}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /><span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />{c.phone}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3 h-3",
                        i < Math.round(c.trust_score / 2)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{c.trust_score}/10</span>
                </div>
                {c.last_contact && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.last_contact), "d MMM", { locale: es })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
