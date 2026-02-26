"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type MetricPoint = {
  metric_date: string;
  mood_score: number | null;
  energy_level: number | null;
  sleep_hours: number | null;
};

export function TrendChart({ data }: { data: MetricPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Registra métricas diarias para ver la tendencia
      </p>
    );
  }

  const chartData = data.map((d) => ({
    day: format(parseISO(d.metric_date), "EEE", { locale: es }),
    Mood: d.mood_score,
    Energía: d.energy_level,
    Sueño: d.sleep_hours != null ? Math.round(d.sleep_hours * 10) / 10 : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="Mood"    stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="Energía" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="Sueño"   stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
