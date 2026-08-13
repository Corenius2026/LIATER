-- ================================================================
-- FIX: Eliminar recursion infinita en politica RLS de users_profile
-- ================================================================
-- La politica "Admin full access" usaba una subquery a users_profile
-- dentro de su propia clausula USING, causando recursion infinita.
-- Solucion: funcion SECURITY DEFINER que bypasea RLS al ejecutarse.

-- 1. Funcion que obtiene el rol del usuario autenticado sin activar RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users_profile
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Eliminar la politica recursiva
DROP POLICY IF EXISTS "Admin full access to users_profile" ON public.users_profile;

-- 3. Recrear la politica de admin usando la funcion (no recursiva)
CREATE POLICY "Admin full access to users_profile"
  ON public.users_profile
  FOR ALL
  USING (public.get_auth_user_role() = 'admin')
  WITH CHECK (public.get_auth_user_role() = 'admin');
