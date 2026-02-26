"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, Check, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Category = { id: string; name: string; type: string; icon: string | null; color: string | null };
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  source: string | null;
  transaction_date: string;
  category_id: string | null;
  finance_categories: Category | null;
};

interface FinancesClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  financePreferences: {
    currency: string;
    locale: string;
    useGrouping: boolean;
    dailySpendLimit: number;
  };
}

export function FinancesClient({ initialTransactions, categories, financePreferences }: FinancesClientProps) {
  const supabase = createClient();
  const [txs, setTxs] = useState<Transaction[]>(initialTransactions);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", type: "income" as "income" | "expense",
    category_id: "", transaction_date: format(new Date(), "yyyy-MM-dd"), source: "",
  });

  const filtered = filterType === "all" ? txs : txs.filter((t) => t.type === filterType);

  const { totalIncome, totalExpense, balance, chartData } = useMemo(() => {
    const income  = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Group by month (last 6 months)
    const byMonth: Record<string, { income: number; expense: number }> = {};
    txs.forEach((t) => {
      const key = t.transaction_date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
      byMonth[key][t.type] += t.amount;
    });
    const chart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({
        month: format(new Date(month + "-01"), "MMM", { locale: es }),
        Ingresos: v.income,
        Gastos: v.expense,
      }));

    return { totalIncome: income, totalExpense: expense, balance: income - expense, chartData: chart };
  }, [txs]);

  async function handleCreate() {
    if (!form.title.trim() || !form.amount) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("finances")
      .insert({
        user_id: user.id,
        title: form.title,
        amount: parseFloat(form.amount),
        type: form.type,
        category_id: form.category_id || null,
        transaction_date: form.transaction_date,
        source: form.source || null,
      })
      .select("*, finance_categories(name, icon, color)")
      .single();

    if (data) setTxs((prev) => [data as unknown as Transaction, ...prev]);
    setLoading(false);
    setShowForm(false);
    setForm({ title: "", amount: "", type: "income", category_id: "", transaction_date: format(new Date(), "yyyy-MM-dd"), source: "" });
  }

  async function deleteTx(id: string) {
    await supabase.from("finances").delete().eq("id", id);
    setTxs((prev) => prev.filter((t) => t.id !== id));
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(financePreferences.locale, {
      style: "currency",
      currency: financePreferences.currency,
      maximumFractionDigits: 0,
      useGrouping: financePreferences.useGrouping,
    }).format(n);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayExpense = txs
    .filter((t) => t.type === "expense" && t.transaction_date === today)
    .reduce((sum, t) => sum + t.amount, 0);
  const spendProgress =
    financePreferences.dailySpendLimit > 0
      ? Math.min(100, (todayExpense / financePreferences.dailySpendLimit) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Finanzas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{txs.length} transacciones registradas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar
        </button>
      </div>

      {financePreferences.dailySpendLimit > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Gasto de hoy</span>
            <span className={cn("font-semibold", todayExpense > financePreferences.dailySpendLimit ? "text-red-400" : "text-emerald-400")}>
              {fmt(todayExpense)} / {fmt(financePreferences.dailySpendLimit)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full rounded-full", todayExpense > financePreferences.dailySpendLimit ? "bg-red-500" : "bg-emerald-500")}
              style={{ width: `${spendProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Ingresos", value: totalIncome,  icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400",  bg: "bg-green-500/10" },
          { label: "Gastos",   value: totalExpense, icon: <TrendingDown className="w-4 h-4" />, color: "text-red-400",  bg: "bg-red-500/10" },
          { label: "Balance",  value: balance,      icon: <DollarSign className="w-4 h-4" />, color: balance >= 0 ? "text-emerald-400" : "text-red-400", bg: balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", bg, color)}>{icon}</div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", color)}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="glass rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">Ingresos vs Gastos (6 meses)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => fmt(v)}
              />
              <Bar dataKey="Ingresos" fill="#10B981" radius={[4,4,0,0]} />
              <Bar dataKey="Gastos"   fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nueva transacción</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-accent rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-2">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm((p) => ({ ...p, type: t }))}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                  form.type === t
                    ? t === "income" ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"
                    : "border-border hover:bg-accent"
                )}
              >{t === "income" ? "💰 Ingreso" : "💸 Gasto"}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Descripción" autoFocus
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <input type="number" value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder={`Monto (${financePreferences.currency})`} min={0} step={1000}
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <select value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="">Sin categoría</option>
              {categories.filter((c) => c.type === form.type || c.type === "both").map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input type="date" value={form.transaction_date}
              onChange={(e) => setForm((p) => ({ ...p, transaction_date: e.target.value }))}
              className="px-3 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-accent transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={loading || !form.title.trim() || !form.amount}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" />
              Registrar
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {(["all","income","expense"] as const).map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            {t === "all" ? "Todas" : t === "income" ? "Ingresos" : "Gastos"}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      <div className="space-y-2">
        {filtered.map((tx) => (
          <div key={tx.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 group">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm",
              tx.type === "income" ? "bg-green-500/10" : "bg-red-500/10")}>
              {tx.finance_categories?.icon ?? (tx.type === "income" ? "💰" : "💸")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.title}</p>
              <p className="text-xs text-muted-foreground">
                {tx.finance_categories?.name ?? "Sin categoría"} ·{" "}
                {format(new Date(tx.transaction_date + "T00:00:00"), "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <span className={cn("font-semibold text-sm flex-shrink-0",
              tx.type === "income" ? "text-green-400" : "text-red-400")}>
              {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
            </span>
            <button onClick={() => deleteTx(tx.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground opacity-0 group-hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <DollarSign className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No hay transacciones registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
