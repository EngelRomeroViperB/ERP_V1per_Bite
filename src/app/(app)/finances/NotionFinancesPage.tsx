"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DollarSign, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Transaction = {
  id: string;
  concepto: string;
  valor: number;
  fecha: string | null;
  categoria: string;
  tipo: string;
  url: string;
};

export function NotionFinancesPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: "FINANZAS",
        sorts: [{ property: "Fecha Transacción", direction: "descending" }],
        page_size: 100,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = (d.results ?? []).map((p: any) => ({
          id: p.id,
          concepto: p.properties?.["Concepto"]?.title?.[0]?.plain_text ?? "Sin título",
          valor: p.properties?.["Valor"]?.number ?? 0,
          fecha: p.properties?.["Fecha Transacción"]?.date?.start ?? null,
          categoria: p.properties?.["Categoria"]?.select?.name ?? "",
          tipo: p.properties?.["Tipo"]?.select?.name ?? "",
          url: p.url,
        }));
        setTxs(mapped);
      })
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return txs;
    return txs.filter((t) => t.tipo.toLowerCase() === filter);
  }, [txs, filter]);

  const totals = useMemo(() => {
    const income = txs.filter((t) => t.tipo.toLowerCase().includes("ingreso")).reduce((s, t) => s + t.valor, 0);
    const expense = txs.filter((t) => t.tipo.toLowerCase().includes("gasto") || t.tipo.toLowerCase().includes("egreso")).reduce((s, t) => s + t.valor, 0);
    return { income, expense, net: income - expense };
  }, [txs]);

  const fmtCop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Finanzas</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? "Cargando..." : `${filtered.length} transacciones`}
        </p>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-green-400 font-semibold mt-0.5">{fmtCop(totals.income)}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-red-400 font-semibold mt-0.5">{fmtCop(totals.expense)}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p className={cn("font-semibold mt-0.5", totals.net >= 0 ? "text-emerald-400" : "text-red-400")}>{totals.net >= 0 ? "+" : ""}{fmtCop(totals.net)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {[["all", "Todas"], ["ingreso", "Ingresos"], ["gasto", "Gastos"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <DollarSign className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No hay transacciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const isIncome = tx.tipo.toLowerCase().includes("ingreso");
            return (
              <a key={tx.id} href={tx.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-all group">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isIncome ? "bg-green-500/10" : "bg-red-500/10")}>
                  {isIncome ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{tx.concepto}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tx.categoria && <span className="text-xs text-muted-foreground">{tx.categoria}</span>}
                    {tx.fecha && <span className="text-xs text-muted-foreground">{format(new Date(tx.fecha + "T00:00:00"), "d MMM", { locale: es })}</span>}
                  </div>
                </div>
                <span className={cn("text-sm font-semibold flex-shrink-0", isIncome ? "text-green-400" : "text-red-400")}>
                  {isIncome ? "+" : "-"}{fmtCop(Math.abs(tx.valor))}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
