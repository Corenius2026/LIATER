-- Migración: Agregar campo meet_url a class_sessions
-- Propósito: Almacenar el enlace de la sesión en vivo (Google Meet / Zoom / Teams)
-- para que el profesor pueda unirse directamente desde el panel de Inicio.
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS meet_url TEXT DEFAULT NULL;
COMMENT ON COLUMN public.class_sessions.meet_url IS 
  'URL de la sesión en vivo (Google Meet, Zoom, Teams, etc.). Visible para profesor y estudiantes inscritos.';
