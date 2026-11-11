-- Notas y recordatorios del dueño (administrador). Cada usuario ve solo sus propias notas,
-- dentro de la empresa activa. Pegar en el SQL Editor de Supabase.

create table if not exists public.notas (
  id            bigint generated always as identity primary key,
  empresa_id    uuid not null references public.empresas(id) on delete cascade
                default (select p.empresa_activa_id from public.perfiles p where p.id = auth.uid()),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  titulo        text not null default '',
  contenido     text not null default '',
  modulo        text,                    -- 'maquinaria' | 'lecheria' | null (general)
  color         text not null default 'amarillo',
  fijada        boolean not null default false,
  recordar_el   date,                    -- fecha opcional para recordatorio
  hecha         boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists notas_usuario_idx on public.notas (user_id, empresa_id, hecha, fijada desc, created_at desc);

-- updated_at automático
create or replace function public.notas_tocar_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists notas_updated_at on public.notas;
create trigger notas_updated_at before update on public.notas
  for each row execute function public.notas_tocar_updated_at();

-- Seguridad: solo el dueño de la nota, y solo en una empresa de la que es miembro
alter table public.notas enable row level security;

drop policy if exists notas_propias on public.notas;
create policy notas_propias on public.notas
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.membresias m where m.user_id = auth.uid() and m.empresa_id = notas.empresa_id and m.activo)
  );
