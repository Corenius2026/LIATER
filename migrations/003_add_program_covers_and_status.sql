-- ====================================================================
-- Migración 003: Almacenamiento de Portadas y Estado de Programas
-- ====================================================================

-- 1. Agregar las nuevas columnas necesarias a diploma_programs (sin duplicar existentes)
ALTER TABLE diploma_programs 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS enrollment_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS enrollment_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Restricción CHECK para los estados permitidos de los programas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'diploma_programs_status_check'
    ) THEN
        ALTER TABLE diploma_programs 
        ADD CONSTRAINT diploma_programs_status_check 
        CHECK (status IN ('draft', 'published', 'upcoming', 'completed'));
    END IF;
END
$$;

-- 3. Configuración del Bucket de Supabase Storage para Portadas ('program-covers')
-- Limite de tamaño: 5MB (5242880 bytes). Tipos permitidos: image/jpeg, image/png, image/webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('program-covers', 'program-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. Políticas de RLS para el bucket 'program-covers' en storage.objects

-- A) Lectura Pública (Cualquier usuario o visitante puede ver las portadas)
DROP POLICY IF EXISTS "Public Read Program Covers" ON storage.objects;
CREATE POLICY "Public Read Program Covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'program-covers');

-- B) Subida/Escritura exclusiva para Administradores
DROP POLICY IF EXISTS "Admin Upload Program Covers" ON storage.objects;
CREATE POLICY "Admin Upload Program Covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'program-covers' AND (
      EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- C) Actualización exclusiva para Administradores
DROP POLICY IF EXISTS "Admin Update Program Covers" ON storage.objects;
CREATE POLICY "Admin Update Program Covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'program-covers' AND (
      EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- D) Eliminación exclusiva para Administradores
DROP POLICY IF EXISTS "Admin Delete Program Covers" ON storage.objects;
CREATE POLICY "Admin Delete Program Covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'program-covers' AND (
      EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
