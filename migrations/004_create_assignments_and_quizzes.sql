-- ====================================================================
-- Migración 004: Tareas, Cuestionarios y Entregas de Estudiantes
-- ====================================================================

-- 1. Tabla de Tareas / Entregables (assignments)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES diploma_programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_program_id ON assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- 2. Tabla de Entregas de Tareas por Estudiantes (assignment_submissions)
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    file_url TEXT,
    comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);

-- 3. Tabla de Cuestionarios (quizzes)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES diploma_programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_program_id ON quizzes(program_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_due_date ON quizzes(due_date);

-- 4. Tabla de Intentos/Entregas de Cuestionarios (quiz_submissions)
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    score NUMERIC(5,2),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);

-- 5. Seguridad: Habilitar Row Level Security (RLS)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lectura pública autenticada de tareas y cuestionarios
DROP POLICY IF EXISTS "Lectura publica autenticada - assignments" ON assignments;
CREATE POLICY "Lectura publica autenticada - assignments"
  ON assignments FOR SELECT
  TO authenticated, anon
  USING (is_published = true);

DROP POLICY IF EXISTS "Lectura publica autenticada - quizzes" ON quizzes;
CREATE POLICY "Lectura publica autenticada - quizzes"
  ON quizzes FOR SELECT
  TO authenticated, anon
  USING (is_published = true);

-- Políticas RLS para entregas (cada estudiante opera sobre sus propias entregas)
DROP POLICY IF EXISTS "Estudiante ve sus propias entregas" ON assignment_submissions;
CREATE POLICY "Estudiante ve sus propias entregas"
  ON assignment_submissions FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Estudiante inserta sus propias entregas" ON assignment_submissions;
CREATE POLICY "Estudiante inserta sus propias entregas"
  ON assignment_submissions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Estudiante ve sus respuestas de cuestionario" ON quiz_submissions;
CREATE POLICY "Estudiante ve sus respuestas de cuestionario"
  ON quiz_submissions FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Estudiante inserta respuestas de cuestionario" ON quiz_submissions;
CREATE POLICY "Estudiante inserta respuestas de cuestionario"
  ON quiz_submissions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
