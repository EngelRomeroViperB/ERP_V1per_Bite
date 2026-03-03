"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  frequency: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
};

interface DashboardHabitsProps {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  today: string;
}

export function DashboardHabits({ initialHabits, initialLogs, today }: DashboardHabitsProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);

  const completedIds = new Set(logs.filter((l) => l.completed).map((l) => l.habit_id));
  const completedCount = completedIds.size;

  async function toggleHabit(habit: Habit) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = logs.find((l) => l.habit_id === habit.id);

    if (existing) {
      const newCompleted = !existing.completed;
      await supabase
        .from("habit_logs")
        .update({ completed: newCompleted })
        .eq("id", existing.id);
      setLogs((prev) =>
        prev.map((l) => l.id === existing.id ? { ...l, completed: newCompleted } : l)
      );
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, user_id: user.id, log_date: today, completed: true })
        .select()
        .single();
      if (data) setLogs((prev) => [...prev, data as HabitLog]);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">Hábitos de hoy</h3>
        {initialHabits.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {completedCount}/{initialHabits.length}
          </span>
        )}
      </div>
      {initialHabits.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Configura tus hábitos en la sección de Hábitos
        </p>
      ) : (
        <div className="space-y-2">
          {initialHabits.map((habit) => {
            const done = completedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors text-left"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    done
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-border hover:border-orange-400"
                  )}
                >
                  {done && <Check className="w-3 h-3" />}
                </div>
                <span className={cn("text-sm", done && "line-through text-muted-foreground")}>
                  {habit.icon} {habit.name}
                </span>
                {done && <span className="ml-auto text-xs text-orange-400">✓</span>}
              </button>
            );
          })}
          {initialHabits.length > 0 && (
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / initialHabits.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
