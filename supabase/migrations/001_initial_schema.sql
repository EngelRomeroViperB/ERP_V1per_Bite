-- ============================================================
-- 001_initial_schema.sql
-- Core tables for ERP de Vida
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  timezone     text not null default 'America/Bogota',
  preferences  jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── AREAS ───────────────────────────────────────────────────
create table public.areas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.areas(id) on delete set null,
  name        text not null,
  icon        text,
  color       text default '#3B82F6',
  order_index int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── PROJECTS ────────────────────────────────────────────────
create table public.projects (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  area_id         uuid references public.areas(id) on delete set null,
  title           text not null,
  description     text,
  status          text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  start_date      date,
  end_date        date,
  completion_pct  int  not null default 0 check (completion_pct between 0 and 100),
  template_config jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── TASKS ───────────────────────────────────────────────────
create table public.tasks (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete set null,
  area_id            uuid references public.areas(id) on delete set null,
  title              text not null,
  description        text,
  priority           text not null default 'P2' check (priority in ('P1','P2','P3')),
  status             text not null default 'todo' check (status in ('todo','in_progress','done','cancelled')),
  due_date           date,
  completed_at       timestamptz,
  estimated_minutes  int,
  actual_minutes     int,
  tags               jsonb not null default '[]',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── HABITS ──────────────────────────────────────────────────
create table public.habits (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  icon           text,
  frequency      text not null default 'daily' check (frequency in ('daily','weekly')),
  target_streak  int  not null default 30,
  created_at     timestamptz not null default now()
);

create table public.habit_logs (
  id        uuid primary key default uuid_generate_v4(),
  habit_id  uuid not null references public.habits(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  log_date  date not null,
  completed boolean not null default true,
  notes     text,
  unique (habit_id, log_date)
);

-- ─── DAILY METRICS ───────────────────────────────────────────
create table public.daily_metrics (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  metric_date    date not null,
  mood_score     int  check (mood_score between 1 and 10),
  weight_kg      numeric(5,2),
  calories_kcal  int,
  sleep_hours    numeric(4,2),
  sleep_quality  int  check (sleep_quality between 1 and 10),
  energy_level   int  check (energy_level between 1 and 10),
  stress_level   int  check (stress_level between 1 and 10),
  journal_entry  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, metric_date)
);

-- ─── BRAIN NOTES ─────────────────────────────────────────────
create table public.brain_notes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  content    text not null default '',
  type       text not null default 'note' check (type in ('snippet','note','resource')),
  language   text,
  tags       jsonb not null default '[]',
  area_id    uuid references public.areas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── RESOURCES ───────────────────────────────────────────────
create table public.resources (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  area_id    uuid references public.areas(id) on delete set null,
  title      text not null,
  url        text,
  type       text not null default 'link' check (type in ('link','book','course','video','podcast','other')),
  status     text not null default 'pending' check (status in ('pending','in_progress','completed')),
  rating     int  check (rating between 1 and 5),
  tags       jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ─── FINANCES ────────────────────────────────────────────────
create table public.finance_categories (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name    text not null,
  type    text not null default 'both' check (type in ('income','expense','both')),
  icon    text,
  color   text default '#6B7280'
);

create table public.finances (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  category_id      uuid references public.finance_categories(id) on delete set null,
  title            text not null,
  amount           numeric(12,2) not null check (amount >= 0),
  type             text not null check (type in ('income','expense')),
  source           text,
  transaction_date date not null default current_date,
  is_shopify       boolean not null default false,
  shopify_meta     jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

-- ─── CRM ─────────────────────────────────────────────────────
create table public.crm_contacts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  email             text,
  phone             text,
  company           text,
  relationship_type text,
  trust_score       int  not null default 5 check (trust_score between 1 and 10),
  last_contact      timestamptz,
  created_at        timestamptz not null default now()
);

create table public.crm_interactions (
  id               uuid primary key default uuid_generate_v4(),
  contact_id       uuid not null references public.crm_contacts(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  type             text not null default 'call' check (type in ('call','email','meeting','message','other')),
  notes            text,
  interaction_date date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ─── SKILL TREE ──────────────────────────────────────────────
create table public.skill_nodes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  category      text,
  status        text not null default 'pending' check (status in ('pending','learning','mastered')),
  mastery_level int  not null default 0 check (mastery_level between 0 and 100),
  description   text,
  x_pos         numeric(8,2) not null default 0,
  y_pos         numeric(8,2) not null default 0,
  created_at    timestamptz not null default now()
);

create table public.skill_edges (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  source_id    uuid not null references public.skill_nodes(id) on delete cascade,
  target_id    uuid not null references public.skill_nodes(id) on delete cascade,
  relationship text not null default 'prerequisite',
  unique (source_id, target_id)
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null,
  is_read     boolean not null default false,
  action_data jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── AI INSIGHTS ─────────────────────────────────────────────
create table public.ai_insights (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  insight_type     text not null,
  content          text not null,
  data_snapshot    jsonb not null default '{}',
  confidence_score numeric(4,3) not null default 0.5 check (confidence_score between 0 and 1),
  insight_date     date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ─── WEBHOOK LOGS ────────────────────────────────────────────
create table public.webhook_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete set null,
  source      text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'received' check (status in ('received','processed','error')),
  received_at timestamptz not null default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────
create index idx_tasks_user_status   on public.tasks(user_id, status);
create index idx_tasks_due_date      on public.tasks(due_date) where due_date is not null;
create index idx_tasks_priority      on public.tasks(user_id, priority);
create index idx_projects_user       on public.projects(user_id);
create index idx_areas_user          on public.areas(user_id);
create index idx_daily_metrics_date  on public.daily_metrics(user_id, metric_date desc);
create index idx_finances_date       on public.finances(user_id, transaction_date desc);
create index idx_brain_notes_user    on public.brain_notes(user_id, type);
create index idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
create index idx_ai_insights_date    on public.ai_insights(user_id, insight_date desc);
