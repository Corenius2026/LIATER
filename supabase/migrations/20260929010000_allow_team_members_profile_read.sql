-- ========================================================================================
-- MIGRACIÓN: PERMITIR LECTURA DE PERFILES DE COMPAÑEROS DE EQUIPO EN GRUPOS DE TRABAJO
-- ========================================================================================
-- Archivo: supabase/migrations/20260929010000_allow_team_members_profile_read.sql
-- ========================================================================================

-- 1. Función RPC SECURITY DEFINER para consulta segura de perfiles por IDs
-- Permite devolver datos públicos de contacto (nombre, email, rol, teléfono) evitando
-- bloqueos de RLS cuando un estudiante consulta quiénes son sus compañeros de equipo.
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(p_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name character varying,
  email character varying,
  role character varying,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.id, up.full_name, up.email, up.role, up.phone
  FROM public.users_profile up
  WHERE up.id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid[]) TO anon;

-- 2. Política RLS complementaria en users_profile para acceso directo
DROP POLICY IF EXISTS "users_profile_read_team_members" ON public.users_profile;

CREATE POLICY "users_profile_read_team_members"
ON public.users_profile FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.work_group_members wgm_peer
    JOIN public.work_group_members wgm_me ON wgm_me.group_id = wgm_peer.group_id
    WHERE wgm_peer.student_id = users_profile.id
      AND wgm_me.student_id = public.get_auth_profile_id()
  )
);

-- 3. Notificar recarga de schema a PostgREST
NOTIFY pgrst, 'reload schema';
