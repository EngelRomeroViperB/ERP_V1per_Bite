-- ============================================================
-- 004_seed_data.sql
-- Default finance categories and areas (per-user on first login)
-- These are inserted via Edge Function or application logic,
-- not directly, since user_id is dynamic.
-- This file documents the expected seed structure.
-- ============================================================

-- Default finance categories template (insert via app on first login)
-- ('Ventas Nutrisosfit', 'income'), ('Freelance', 'income'),
-- ('Universidad', 'expense'), ('Alimentación', 'expense'),
-- ('Transporte', 'expense'), ('Inversión', 'income'),
-- ('Nómina', 'income'), ('Servicios', 'expense')

-- Default areas template:
-- ('Universidad', NULL, '🎓', '#6366F1'),
-- ('Nutrisosfit', NULL, '💪', '#10B981'),
-- ('Salud Física', NULL, '🏃', '#F59E0B'),
-- ('Desarrollo Personal', NULL, '🧠', '#8B5CF6'),
-- ('Finanzas', NULL, '💰', '#EF4444')

-- The application will call the seed_defaults() function on first login.
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_area_uni  uuid;
  v_area_nut  uuid;
  v_area_sal  uuid;
  v_area_dev  uuid;
  v_area_fin  uuid;
begin
  -- Areas
  insert into public.areas (user_id, name, icon, color, order_index) values
    (p_user_id, 'Universidad',        '🎓', '#6366F1', 1),
    (p_user_id, 'Nutrisosfit',        '💪', '#10B981', 2),
    (p_user_id, 'Salud Física',       '🏃', '#F59E0B', 3),
    (p_user_id, 'Desarrollo Personal','🧠', '#8B5CF6', 4),
    (p_user_id, 'Finanzas',           '💰', '#EF4444', 5)
  on conflict do nothing
  returning id into v_area_uni;

  -- Finance categories
  insert into public.finance_categories (user_id, name, type, icon, color) values
    (p_user_id, 'Ventas Nutrisosfit', 'income',  '💪', '#10B981'),
    (p_user_id, 'Freelance',          'income',  '💻', '#3B82F6'),
    (p_user_id, 'Inversión',          'income',  '📈', '#8B5CF6'),
    (p_user_id, 'Nómina',             'income',  '🏦', '#6366F1'),
    (p_user_id, 'Alimentación',       'expense', '🍔', '#F59E0B'),
    (p_user_id, 'Transporte',         'expense', '🚌', '#F97316'),
    (p_user_id, 'Universidad',        'expense', '🎓', '#6366F1'),
    (p_user_id, 'Servicios',          'expense', '📱', '#EF4444'),
    (p_user_id, 'Salud',              'expense', '💊', '#EC4899'),
    (p_user_id, 'Otros',              'both',    '📦', '#6B7280')
  on conflict do nothing;

  -- Default habits
  insert into public.habits (user_id, name, icon, frequency, target_streak) values
    (p_user_id, 'Ejercicio',    '🏃', 'daily',   30),
    (p_user_id, 'Lectura',      '📚', 'daily',   30),
    (p_user_id, 'Meditación',   '🧘', 'daily',   21),
    (p_user_id, 'Agua (2L)',    '💧', 'daily',   30)
  on conflict do nothing;
end;
$$;
