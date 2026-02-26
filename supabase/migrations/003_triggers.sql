-- ============================================================
-- 003_triggers.sql
-- Automated triggers and PL/pgSQL functions
-- ============================================================

-- ─── 1. AUTO-CREATE PROFILE ON SIGNUP ────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_create_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. AUTO UPDATED_AT ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger trg_updated_at_projects
  before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger trg_updated_at_tasks
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

create trigger trg_updated_at_daily_metrics
  before update on public.daily_metrics
  for each row execute procedure public.set_updated_at();

create trigger trg_updated_at_brain_notes
  before update on public.brain_notes
  for each row execute procedure public.set_updated_at();

-- ─── 3. UPDATE PROJECT COMPLETION % ─────────────────────────
create or replace function public.update_project_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project_id uuid;
  v_total      int;
  v_done       int;
  v_pct        int;
begin
  -- Use new or old row depending on operation
  v_project_id := coalesce(new.project_id, old.project_id);

  if v_project_id is null then
    return coalesce(new, old);
  end if;

  select
    count(*) filter (where status != 'cancelled'),
    count(*) filter (where status = 'done')
  into v_total, v_done
  from public.tasks
  where project_id = v_project_id;

  if v_total = 0 then
    v_pct := 0;
  else
    v_pct := round((v_done::numeric / v_total::numeric) * 100);
  end if;

  update public.projects
  set completion_pct = v_pct,
      status = case
        when v_pct = 100 then 'completed'
        else status
      end
  where id = v_project_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_update_project_completion
  after insert or update of status or delete on public.tasks
  for each row execute procedure public.update_project_completion();

-- ─── 4. NOTIFY P1 TASKS DUE SOON ────────────────────────────
create or replace function public.notify_p1_due()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.priority = 'P1'
     and new.status not in ('done', 'cancelled')
     and new.due_date is not null
     and new.due_date <= current_date + interval '1 day'
  then
    insert into public.notifications (user_id, title, body, type, action_data)
    values (
      new.user_id,
      'Tarea P1 por vencer',
      'La tarea "' || new.title || '" vence ' ||
        case
          when new.due_date = current_date then 'hoy'
          else 'mañana'
        end,
      'task_due_p1',
      jsonb_build_object('task_id', new.id)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_notify_p1_due
  after insert or update of priority, status, due_date on public.tasks
  for each row execute procedure public.notify_p1_due();

-- ─── 5. SET completed_at WHEN TASK DONE ──────────────────────
create or replace function public.set_task_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and old.status != 'done' then
    new.completed_at := now();
  elsif new.status != 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_task_completed_at
  before update of status on public.tasks
  for each row execute procedure public.set_task_completed_at();

-- ─── 6. UPDATE last_contact IN CRM ───────────────────────────
create or replace function public.update_contact_last_interaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.crm_contacts
  set last_contact = now()
  where id = new.contact_id;
  return new;
end;
$$;

create trigger trg_update_last_contact
  after insert on public.crm_interactions
  for each row execute procedure public.update_contact_last_interaction();
