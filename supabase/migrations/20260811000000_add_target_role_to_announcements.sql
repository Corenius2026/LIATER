-- Migration: Add target_role to announcements
-- Desc: Permite definir a qué rol de usuario va dirigido un anuncio ('all', 'student', 'teacher')

ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS target_role VARCHAR DEFAULT 'all';

-- Update existing records to 'all' just in case, though DEFAULT handles this for new ones.
UPDATE public.announcements SET target_role = 'all' WHERE target_role IS NULL;
