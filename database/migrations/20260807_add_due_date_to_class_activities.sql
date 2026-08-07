-- Ejecutar en Supabase SQL Editor
ALTER TABLE class_activities 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
