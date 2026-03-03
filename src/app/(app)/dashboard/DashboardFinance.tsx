"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinanceTrendChart } from "./FinanceTrendChart";
import { format } from "date-fns";

type FinanceSource = "ambas" | "notion" | "shopify";

type ShopifyTx = {
  transaction_date: string;
  amount: number;
  type: string;
  source: string;
};

type NotionTx = {
  fecha: string;
  valor: number;
  tipo: string;
};

interface DashboardFinanceProps {
  shopifyFinances: ShopifyTx[];
  currency: string;
  locale: string;
  useGrouping: boolean;
}

export function DashboardFinance({ shopifyFinances, currency, locale, useGrouping }: DashboardFinanceProps) {
  const [notionTxs, setNotionTxs] = useState<NotionTx[]>([]);
  const [source, setSource] = useState<FinanceSource>("ambas");

  useEffect(() => {
    const days14Start = format(new Date(Date.now() - 13 * 86400000), "yyyy-MM-dd");

    fetch("/api/notion/query-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: "FINANZAS",
        filter: {
          property: "Fecha Transacción",
          date: { on_or_after: days14Start },
        },
        sorts: [{ property: "Fecha Transacción", direction: "ascending" }],
        page_size: 100,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped: NotionTx[] = (d.results ?? []).map((p: any) => ({
          fecha: p.properties?.["Fecha Transacción"]?.date?.start ?? "",
          valor: p.properties?.["Valor"]?.number ?? 0,
          tipo: (p.properties?.["Tipo"]?.select?.name ?? "").toLowerCase(),
        }));
        setNotionTxs(mapped);
      })
      .catch(() => setNotionTxs([]));
  }, []);

  const fmtCurrency = useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        useGrouping,
      }).format(value),
    [currency, locale, useGrouping]
  );

  const { financeTrend, income14, expense14, net14, shopifyIncome14 } = useMemo(() => {
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (let i = 13; i >= 0; i -= 1) {
      const date = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      dayMap.set(date, { income: 0, expense: 0 });
    }

    if (source === "ambas" || source === "shopify") {
      for (const tx of shopifyFinances) {
        const row = dayMap.get(tx.transaction_date);
        if (!row) continue;
        if (tx.type === "income") row.income += Number(tx.amount ?? 0);
        else row.expense += Number(tx.amount ?? 0);
      }
    }

    if (source === "ambas" || source === "notion") {
      for (const tx of notionTxs) {
        if (!tx.fecha) continue;
        const row = dayMap.get(tx.fecha);
        if (!row) continue;
        if (tx.tipo === "ingreso" || tx.tipo === "income") row.income += tx.valor;
        else row.expense += tx.valor;
      }
    }

    const trend = Array.from(dayMap.entries()).map(([date, values]) => ({
      date,
      income: values.income,
      expense: values.expense,
      net: values.income - values.expense,
    }));

    const inc = trend.reduce((s, d) => s + d.income, 0);
    const exp = trend.reduce((s, d) => s + d.expense, 0);

    const shopify = shopifyFinances
      .filter((tx) => tx.type === "income" && (tx.source ?? "").toLowerCase().includes("shopify"))
      .reduce((s, tx) => s + Number(tx.amount ?? 0), 0);

    return { financeTrend: trend, income14: inc, expense14: exp, net14: inc - exp, shopifyIncome14: shopify };
  }, [shopifyFinances, notionTxs, source]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold">Finanzas (14 días)</h3>
        <div className="ml-auto flex gap-0.5 bg-secondary rounded-lg p-0.5">
          {([["ambas", "Ambas"], ["notion", "Notion"], ["shopify", "Shopify"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setSource(v)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                source === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-2">
          <p className="text-muted-foreground">Ingresos</p>
          <p className="text-green-300 font-semibold mt-0.5">{fmtCurrency(income14)}</p>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2">
          <p className="text-muted-foreground">Gastos</p>
          <p className="text-red-300 font-semibold mt-0.5">{fmtCurrency(expense14)}</p>
        </div>
        <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-2">
          <p className="text-muted-foreground">Shopify</p>
          <p className="text-cyan-300 font-semibold mt-0.5">{fmtCurrency(shopifyIncome14)}</p>
        </div>
      </div>
      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 mb-3">
        <p className="text-xs text-muted-foreground">Balance neto</p>
        <p className={`text-lg font-bold ${net14 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {net14 >= 0 ? "+" : ""}{fmtCurrency(net14)}
        </p>
      </div>
      <FinanceTrendChart data={financeTrend} />
    </div>
  );
}
