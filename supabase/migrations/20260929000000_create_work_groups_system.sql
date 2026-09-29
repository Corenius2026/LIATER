-- ========================================================================================
-- MIGRACIÓN: SISTEMA DE GRUPOS DE TRABAJO Y ENTREGABLES POR PROGRAMA
-- ========================================================================================
-- Archivo: supabase/migrations/20260929000000_create_work_groups_system.sql
-- ========================================================================================

-- 1. Tabla de Grupos de Trabajo (work_groups)
CREATE TABLE IF NOT EXISTS public.work_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  name character varying NOT NULL,
  project_topic character varying,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_groups_pkey PRIMARY KEY (id),
  CONSTRAINT work_groups_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  CONSTRAINT work_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users_profile(id) ON DELETE SET NULL
);

-- 2. Tabla de Integrantes de Grupo (work_group_members)
CREATE TABLE IF NOT EXISTS public.work_group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  student_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  assigned_by uuid,
  CONSTRAINT work_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT work_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.work_groups(id) ON DELETE CASCADE,
  CONSTRAINT work_group_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users_profile(id) ON DELETE CASCADE,
  CONSTRAINT work_group_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users_profile(id) ON DELETE SET NULL,
  CONSTRAINT work_group_members_group_student_unique UNIQUE (group_id, student_id)
);

-- 3. Tabla de Materiales / Entregables de Grupo (work_group_materials)
CREATE TABLE IF NOT EXISTS public.work_group_materials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  uploaded_by uuid,
  title character varying NOT NULL,
  description text,
  material_type character varying NOT NULL DEFAULT 'file',
  url text NOT NULL,
  file_name text,
  file_size bigint,
  provider character varying DEFAULT 'external',
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_group_materials_pkey PRIMARY KEY (id),
  CONSTRAINT work_group_materials_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.work_groups(id) ON DELETE CASCADE,
  CONSTRAINT work_group_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users_profile(id) ON DELETE SET NULL
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_work_groups_program_id ON public.work_groups(program_id);
CREATE INDEX IF NOT EXISTS idx_work_group_members_group_id ON public.work_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_work_group_members_student_id ON public.work_group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_work_group_materials_group_id ON public.work_group_materials(group_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.work_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_materials ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas antiguas si existen
DROP POLICY IF EXISTS "work_groups_admin_all" ON public.work_groups;
DROP POLICY IF EXISTS "work_groups_auth_select" ON public.work_groups;
DROP POLICY IF EXISTS "work_groups_select" ON public.work_groups;

DROP POLICY IF EXISTS "work_group_members_admin_all" ON public.work_group_members;
DROP POLICY IF EXISTS "work_group_members_auth_select" ON public.work_group_members;
DROP POLICY IF EXISTS "work_group_members_select" ON public.work_group_members;

DROP POLICY IF EXISTS "work_group_materials_admin_all" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_auth_select" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_select" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_member_insert" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_owner_delete" ON public.work_group_materials;

-- Políticas para work_groups
CREATE POLICY "work_groups_admin_all"
ON public.work_groups FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "work_groups_select"
ON public.work_groups FOR SELECT
USING (true);

-- Políticas para work_group_members
CREATE POLICY "work_group_members_admin_all"
ON public.work_group_members FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "work_group_members_select"
ON public.work_group_members FOR SELECT
USING (true);

-- Políticas para work_group_materials
CREATE POLICY "work_group_materials_admin_all"
ON public.work_group_materials FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "work_group_materials_select"
ON public.work_group_materials FOR SELECT
USING (true);

CREATE POLICY "work_group_materials_member_insert"
ON public.work_group_materials FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.work_group_members wgm
    WHERE wgm.group_id = work_group_materials.group_id
      AND wgm.student_id = public.get_auth_profile_id()
  )
);

CREATE POLICY "work_group_materials_owner_delete"
ON public.work_group_materials FOR DELETE
TO authenticated
USING (
  public.is_admin() OR
  uploaded_by = public.get_auth_profile_id()
);

-- Notificar recarga de schema a PostgREST
NOTIFY pgrst, 'reload schema';
