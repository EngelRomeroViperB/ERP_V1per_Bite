"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

type FinancePoint = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

const fmtCop = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function FinanceTrendChart({ data }: { data: FinancePoint[] }) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Sin movimientos financieros recientes.</p>;
  }

  const chartData = data.map((d) => ({
    day: format(parseISO(d.date), "d/M"),
    Ingresos: d.income,
    Gastos: d.expense,
    Neto: d.net,
  }));

  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => fmtCop(value)}
        />
        <Area type="monotone" dataKey="Ingresos" stroke="#10B981" fill="#10B98122" strokeWidth={2} />
        <Area type="monotone" dataKey="Gastos" stroke="#EF4444" fill="#EF444422" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
