-- Ejecutar esto en el SQL Editor de Supabase
ALTER TABLE diploma_programs 
ADD COLUMN IF NOT EXISTS program_type VARCHAR(50) DEFAULT 'diplomado' CHECK (program_type IN ('diplomado', 'curso'));

-- Si quieres actualizar los programas existentes (opcional)
-- UPDATE diploma_programs SET program_type = 'diplomado' WHERE program_type IS NULL;
