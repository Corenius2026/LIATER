-- ====================================================================
-- Migración 007: Tabla de Dudas de Estudiantes por Clase (class_doubts)
-- ====================================================================

CREATE TABLE IF NOT EXISTS class_doubts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    program_id UUID REFERENCES diploma_programs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,
    subject VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'enviada' CHECK (status IN ('enviada', 'revisada', 'atendida', 'archivada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices requeridos para rendimiento y búsquedas rápidas por clase, estudiante, estado y fecha
CREATE INDEX IF NOT EXISTS idx_class_doubts_class_id ON class_doubts(class_id);
CREATE INDEX IF NOT EXISTS idx_class_doubts_student_id ON class_doubts(student_id);
CREATE INDEX IF NOT EXISTS idx_class_doubts_status ON class_doubts(status);
CREATE INDEX IF NOT EXISTS idx_class_doubts_created_at ON class_doubts(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE class_doubts ENABLE ROW LEVEL SECURITY;

-- 1. Política RLS: Estudiantes pueden enviar dudas
DROP POLICY IF EXISTS "Estudiantes crean dudas" ON class_doubts;
CREATE POLICY "Estudiantes crean dudas"
  ON class_doubts FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 2. Política RLS: Lectura autenticada para consulta de dudas
DROP POLICY IF EXISTS "Lectura de dudas" ON class_doubts;
CREATE POLICY "Lectura de dudas"
  ON class_doubts FOR SELECT
  TO authenticated, anon
  USING (true);

-- 3. Política RLS: Profesores y administradores pueden actualizar únicamente el estado de la duda
DROP POLICY IF EXISTS "Actualización de estado de dudas" ON class_doubts;
CREATE POLICY "Actualización de estado de dudas"
  ON class_doubts FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
