-- KineDom en Supabase.
-- En el panel: SQL Editor, pega este archivo y ejecútalo una vez.
-- Authentication > Providers > Email: desactiva "Confirm email" para que,
-- al crear la cuenta, la persona entre directo a su panel.
-- Authentication > URL Configuration: agrega la dirección real del sitio
-- y la página restablecer.html como URL de redirección.
-- Luego crea el administrador en Authentication > Users y ejecuta el update del final.

create extension if not exists pgcrypto;

create or replace function public.safe_int(value text)
returns integer
language plpgsql
immutable
as $$
begin
  if value is null or value !~ '^[0-9]+$' then
    return null;
  end if;
  return value::integer;
exception when others then
  return null;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nombre text not null,
  edad integer,
  direccion text,
  codigo text,
  celular text,
  role text not null default 'patient' check (role in ('patient', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_content (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.schedule (
  id integer primary key default 1 check (id = 1),
  published boolean not null default false,
  slots jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.schedule (id, published, slots)
values (1, false, '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  fecha date not null,
  hora text not null,
  modalidad text not null check (modalidad in ('Domicilio', 'Telemedicina')),
  nombre text,
  edad integer,
  direccion text,
  patologia text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'rechazado')),
  created_at timestamptz not null default now()
);

alter table public.citas add column if not exists estado text not null default 'pendiente';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'citas_estado_check' and conrelid = 'public.citas'::regclass
  ) then
    alter table public.citas
      add constraint citas_estado_check
      check (estado in ('pendiente', 'confirmado', 'rechazado'));
  end if;
end $$;

alter table public.citas drop constraint if exists citas_fecha_hora_key;

create unique index if not exists citas_fecha_hora_activa
  on public.citas (fecha, hora)
  where estado <> 'rechazado';

create or replace function public.protect_cita_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.estado := 'pendiente';
    else
      new.estado := old.estado;
    end if;
  end if;
  if new.estado is null or new.estado not in ('pendiente', 'confirmado', 'rechazado') then
    new.estado := 'pendiente';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_cita_estado on public.citas;
create trigger protect_cita_estado
  before insert or update on public.citas
  for each row execute function public.protect_cita_estado();

create table if not exists public.informes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  nombre text not null,
  fecha timestamptz not null default now(),
  texto text,
  informe_fecha timestamptz
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, edad, direccion, codigo, celular, role)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
    public.safe_int(new.raw_user_meta_data->>'edad'),
    nullif(trim(new.raw_user_meta_data->>'direccion'), ''),
    nullif(trim(new.raw_user_meta_data->>'codigo'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'celular', ''), '\D', '', 'g'), ''),
    'patient'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.schedule enable row level security;
alter table public.citas enable row level security;
alter table public.informes enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists content_read on public.site_content;
create policy content_read on public.site_content
  for select using (true);

drop policy if exists content_write on public.site_content;
create policy content_write on public.site_content
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists content_insert on public.site_content;
create policy content_insert on public.site_content
  for insert with check (public.is_admin());

drop policy if exists schedule_read on public.schedule;
create policy schedule_read on public.schedule
  for select using (true);

drop policy if exists schedule_write on public.schedule;
create policy schedule_write on public.schedule
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists schedule_insert on public.schedule;
create policy schedule_insert on public.schedule
  for insert with check (public.is_admin());

drop policy if exists citas_admin on public.citas;
create policy citas_admin on public.citas
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists citas_patient_select on public.citas;
create policy citas_patient_select on public.citas
  for select using (user_id = auth.uid());

drop policy if exists citas_patient_insert on public.citas;
create policy citas_patient_insert on public.citas
  for insert with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

drop policy if exists informes_admin on public.informes;
create policy informes_admin on public.informes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists informes_patient_select on public.informes;
create policy informes_patient_select on public.informes
  for select using (user_id = auth.uid());

drop policy if exists informes_patient_insert on public.informes;
create policy informes_patient_insert on public.informes
  for insert with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create or replace function public.citas_ocupadas()
returns table (fecha date, hora text)
language sql
stable
security definer
set search_path = public
as $$
  select c.fecha, left(c.hora, 5)
  from public.citas c
  where c.estado <> 'rechazado';
$$;

create or replace function public.find_account_emails(p_nombre text, p_codigo text, p_celular text)
returns table (email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(regexp_replace(trim(p.nombre), '\s+', ' ', 'g'))
      = lower(regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g'))
    and p.codigo = p_codigo
    and p.celular = regexp_replace(coalesce(p_celular, ''), '\D', '', 'g')
    and p.role = 'patient';
$$;

create or replace function public.delete_patient(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if target = auth.uid() then
    raise exception 'No puedes eliminar la cuenta de administrador.';
  end if;
  if not exists (select 1 from public.profiles where id = target and role = 'patient') then
    raise exception 'No encontramos a esa persona.';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.delete_patient(uuid) from public, anon;
grant execute on function public.delete_patient(uuid) to authenticated;
grant execute on function public.citas_ocupadas() to anon, authenticated;
grant execute on function public.find_account_emails(text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists site_images_read on storage.objects;
create policy site_images_read on storage.objects
  for select using (bucket_id = 'site-images');

drop policy if exists site_images_insert on storage.objects;
create policy site_images_insert on storage.objects
  for insert with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_update on storage.objects;
create policy site_images_update on storage.objects
  for update using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_delete on storage.objects;
create policy site_images_delete on storage.objects
  for delete using (bucket_id = 'site-images' and public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.citas;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.informes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.schedule;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.site_content;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- La cuenta erickbarriosarias30@gmail.com ya está creada.
-- Confírmala en Authentication > Users y luego ejecuta:
-- update public.profiles
-- set role = 'admin', nombre = 'Administrador'
-- where email = 'erickbarriosarias30@gmail.com';
