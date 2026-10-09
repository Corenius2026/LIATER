-- ============================================================================
-- Migración: Agregar columna allow_download a la tabla work_group_materials
-- Permite controlar si un material de grupo de trabajo es descargable
-- por estudiantes/compañeros de equipo o si es de solo lectura in-app (PDFs).
-- Los formatos no previsualizables (.dwg, .xlsx, .zip, etc.) son descargables por defecto.
-- ============================================================================

-- 1. Agregar columna allow_download con valor predeterminado false
ALTER TABLE public.work_group_materials
ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT false;

-- 2. Actualizar materiales que sean planos CAD (.dwg, .dxf), hojas de cálculo (Excel)
-- o archivos comprimidos para que sean descargables de forma predeterminada
UPDATE public.work_group_materials
SET allow_download = true
WHERE file_name ILIKE '%.dwg'
   OR file_name ILIKE '%.dxf'
   OR file_name ILIKE '%.xlsx'
   OR file_name ILIKE '%.xls'
   OR file_name ILIKE '%.csv'
   OR file_name ILIKE '%.zip'
   OR file_name ILIKE '%.rar'
   OR file_name ILIKE '%.7z'
   OR file_name ILIKE '%.tar'
   OR file_name ILIKE '%.gz'
   OR file_name ILIKE '%.doc'
   OR file_name ILIKE '%.docx'
   OR title ILIKE '%.dwg%'
   OR title ILIKE '%.xlsx%'
   OR title ILIKE '%.xls%'
   OR material_type = 'archive';

-- 3. Crear índice para optimizar consultas con filtro de descarga
CREATE INDEX IF NOT EXISTS idx_work_group_materials_allow_download
ON public.work_group_materials(allow_download);

-- 4. Notificar recarga de schema a PostgREST
NOTIFY pgrst, 'reload schema';
