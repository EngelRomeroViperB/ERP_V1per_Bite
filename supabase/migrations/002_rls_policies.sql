-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security for all user tables
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.areas            enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.habits           enable row level security;
alter table public.habit_logs       enable row level security;
alter table public.daily_metrics    enable row level security;
alter table public.brain_notes      enable row level security;
alter table public.resources        enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finances         enable row level security;
alter table public.crm_contacts     enable row level security;
alter table public.crm_interactions enable row level security;
alter table public.skill_nodes      enable row level security;
alter table public.skill_edges      enable row level security;
alter table public.notifications    enable row level security;
alter table public.ai_insights      enable row level security;
alter table public.webhook_logs     enable row level security;

-- Helper macro: each table gets a single all-purpose policy
-- keyed on auth.uid() = user_id

create policy "profiles: own data"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

create policy "areas: own data"
  on public.areas for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects: own data"
  on public.projects for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks: own data"
  on public.tasks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habits: own data"
  on public.habits for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habit_logs: own data"
  on public.habit_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_metrics: own data"
  on public.daily_metrics for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brain_notes: own data"
  on public.brain_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resources: own data"
  on public.resources for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "finance_categories: own data"
  on public.finance_categories for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "finances: own data"
  on public.finances for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "crm_contacts: own data"
  on public.crm_contacts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "crm_interactions: own data"
  on public.crm_interactions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skill_nodes: own data"
  on public.skill_nodes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skill_edges: own data"
  on public.skill_edges for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications: own data"
  on public.notifications for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ai_insights: own data"
  on public.ai_insights for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "webhook_logs: own data"
  on public.webhook_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
