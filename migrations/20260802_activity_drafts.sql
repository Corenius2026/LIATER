-- ============================================================
-- Migración: activity_drafts
-- Tabla de borradores generados automáticamente por IA
-- (Google Drive Automation → Gemini → revisión del profesor)
-- ============================================================

create table if not exists public.activity_drafts (
  id              uuid primary key default extensions.uuid_generate_v4(),

  -- Clase a la que pertenece el borrador
  class_id        uuid not null
                  references public.class_sessions(id) on delete cascade,

  -- Carpeta de Drive que originó el borrador (para trazabilidad)
  drive_folder_id text,

  -- JSON completo generado por Gemini
  -- Estructura: { activity_title, activity_description, questions: [...] }
  draft_data      jsonb not null,

  -- Estado del ciclo de vida del borrador
  status          text not null default 'pending'
                  constraint activity_drafts_status_check
                  check (status in ('pending', 'approved', 'rejected')),

  -- Quién revisó (profesor o admin que aprobó/rechazó)
  reviewed_by     uuid references public.users_profile(id) on delete set null,
  reviewed_at     timestamptz,

  created_at      timestamptz not null default now()
);

-- Índices útiles para las consultas del panel de borradores
create index if not exists idx_activity_drafts_class_id
  on public.activity_drafts(class_id);

create index if not exists idx_activity_drafts_status
  on public.activity_drafts(status);

create index if not exists idx_activity_drafts_drive_folder
  on public.activity_drafts(drive_folder_id)
  where drive_folder_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.activity_drafts enable row level security;

-- Profesores y admins pueden ver todos los borradores
drop policy if exists "Teachers y admins leen borradores" on public.activity_drafts;
create policy "Teachers y admins leen borradores"
  on public.activity_drafts
  for select
  using (
    exists (
      select 1
      from public.users_profile
      where (auth_user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'teacher')
        and is_active = true
    )
  );

-- Solo admins y profesores pueden actualizar el estado (aprobar / rechazar)
drop policy if exists "Teachers y admins actualizan borradores" on public.activity_drafts;
create policy "Teachers y admins actualizan borradores"
  on public.activity_drafts
  for update
  using (
    exists (
      select 1
      from public.users_profile
      where (auth_user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'teacher')
        and is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.users_profile
      where (auth_user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'teacher')
        and is_active = true
    )
  );

-- ── Permisos de tabla (GRANT) ───────────────────────────────────────────────
grant all on table public.activity_drafts to anon, authenticated, service_role;
