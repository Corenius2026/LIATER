-- ====================================================================
-- MIGRACIÓN: Endurecimiento del flujo de invitación de usuarios
-- ====================================================================

-- 1. Agregar columna invited_at para rastrear estado de invitación
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT NULL;

-- 2. Habilitar RLS en users_profile (si no estaba ya habilitado)
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para users_profile
-- 3a. Admins tienen acceso completo a todos los perfiles
DROP POLICY IF EXISTS "Admin full access to users_profile" ON public.users_profile;
CREATE POLICY "Admin full access to users_profile"
  ON public.users_profile
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
    )
  );

-- 3b. Cada usuario puede leer su propio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON public.users_profile;
CREATE POLICY "Users can read own profile"
  ON public.users_profile
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 3c. Cada usuario puede actualizar campos seguros de su propio perfil
--     WITH CHECK previene que el usuario cambie su propio role
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.users_profile;
CREATE POLICY "Users can update own safe fields"
  ON public.users_profile
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND role = (
      SELECT role FROM public.users_profile
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
