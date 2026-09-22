-- ============================================================================
-- Migración: Agregar fecha límite de entrega a las actividades de clase
-- Tabla: public.class_activities
-- ============================================================================

ALTER TABLE public.class_activities 
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone NULL;

COMMENT ON COLUMN public.class_activities.due_date IS 'Fecha y hora límite para que los estudiantes presenten la actividad de reforzamiento.';
