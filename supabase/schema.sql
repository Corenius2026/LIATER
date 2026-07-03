-- ============================================================
--  SCRIPT SQL — Plataforma del Diplomado FV
--  Base de datos: Supabase (PostgreSQL)
--
--  Instrucciones:
--  1. Ve a tu proyecto en supabase.com
--  2. Abre el menú SQL Editor
--  3. Pega todo este script y haz clic en "Run"
--
--  IMPORTANTE: Supabase ya crea la tabla auth.users de forma
--  automática. Las tablas de aquí extienden ese sistema.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PASO 1: Extensión para UUIDs automáticos
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────
-- PASO 2: Tabla de perfiles de usuario (user_profiles)
-- Conectada a auth.users de Supabase via user_id
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    role       TEXT NOT NULL DEFAULT 'student'
                   CHECK (role IN ('student', 'teacher', 'admin')),
    avatar     TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida por rol
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);


-- ─────────────────────────────────────────────────────────────
-- PASO 3: Tabla de perfiles de profesores (teacher_profiles)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id  UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    bio      TEXT,
    area     TEXT,
    photo    TEXT,
    linkedin TEXT
);


-- ─────────────────────────────────────────────────────────────
-- PASO 4: Tabla del programa del diplomado (diploma_programs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diploma_programs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    description TEXT,
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- PASO 5: Tabla de módulos (modules)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diploma_id  UUID NOT NULL REFERENCES diploma_programs(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    "order"     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_diploma ON modules(diploma_id);
CREATE INDEX IF NOT EXISTS idx_modules_order   ON modules(diploma_id, "order");


-- ─────────────────────────────────────────────────────────────
-- PASO 6: Tabla de subtemas (subtopics)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtopics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    "order"     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtopics_module ON subtopics(module_id);


-- ─────────────────────────────────────────────────────────────
-- PASO 7: Tabla de clases / sesiones (class_sessions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
    teacher_id  UUID          REFERENCES teacher_profiles(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    description TEXT,
    date        TIMESTAMPTZ,
    video_url   TEXT,
    meet_link   TEXT,
    duration    INTEGER,        -- duración en minutos
    status      TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    "order"     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_subtopic ON class_sessions(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher  ON class_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_status   ON class_sessions(status);


-- ─────────────────────────────────────────────────────────────
-- PASO 8: Tabla de recursos (resources)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id   UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    type       TEXT NOT NULL
                   CHECK (type IN ('presentation', 'pdf', 'link', 'file')),
    url        TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_class ON resources(class_id);


-- ─────────────────────────────────────────────────────────────
-- PASO 9: Tabla de anuncios (announcements)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    tag        TEXT NOT NULL DEFAULT 'general'
                   CHECK (tag IN ('general', 'urgent', 'info')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON announcements(teacher_id);


-- ─────────────────────────────────────────────────────────────
-- PASO 10: Seguridad — Row Level Security (RLS)
-- Protege cada tabla para que solo Supabase Auth pueda operar.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diploma_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements    ENABLE ROW LEVEL SECURITY;


-- ── Políticas públicas de LECTURA (cualquier usuario autenticado puede leer) ──
CREATE POLICY "Lectura pública autenticada - diploma_programs"
    ON diploma_programs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - modules"
    ON modules FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - subtopics"
    ON subtopics FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - class_sessions"
    ON class_sessions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - resources"
    ON resources FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - teacher_profiles"
    ON teacher_profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública autenticada - announcements"
    ON announcements FOR SELECT USING (auth.role() = 'authenticated');


-- ── El usuario ve y edita solo su propio perfil ──
CREATE POLICY "Usuario ve su perfil"
    ON user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuario actualiza su perfil"
    ON user_profiles FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
--  FIN DEL SCRIPT
--  Tablas creadas:
--    1. user_profiles
--    2. teacher_profiles
--    3. diploma_programs
--    4. modules
--    5. subtopics
--    6. class_sessions
--    7. resources
--    8. announcements
-- ============================================================
