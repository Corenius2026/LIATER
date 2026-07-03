-- ====================================================================
-- SCRIPT SQL: Esquema Inicial - Plataforma del Diplomado
-- 
-- Descripción:
-- Este script crea las tablas necesarias para gestionar diplomados,
-- módulos, subtemas, clases, profesores y recursos.
-- ====================================================================

-- Habilitar extensión para generar UUIDs automáticamente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. Perfiles de Usuarios (users_profile)
-- Representa a todos los usuarios de la plataforma (estudiantes, profesores, admin)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por rol y email
CREATE INDEX idx_users_profile_role ON users_profile(role);
CREATE INDEX idx_users_profile_email ON users_profile(email);

-- --------------------------------------------------------------------
-- 2. Perfiles de Profesores (teacher_profiles)
-- Información pública y profesional de los usuarios con rol 'teacher'
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    area VARCHAR(255),
    photo_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para la relación con el usuario
CREATE INDEX idx_teacher_profiles_user_id ON teacher_profiles(user_id);

-- --------------------------------------------------------------------
-- 3. Programas de Diplomado (diploma_programs)
-- La entidad principal que agrupa todo el contenido académico
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diploma_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 4. Módulos (modules)
-- Divisiones principales de un diplomado
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diploma_id UUID NOT NULL REFERENCES diploma_programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para obtener los módulos de un diplomado ordenados
CREATE INDEX idx_modules_diploma_id ON modules(diploma_id);
CREATE INDEX idx_modules_order ON modules(diploma_id, order_index);

-- --------------------------------------------------------------------
-- 5. Subtemas (subtopics)
-- Subdivisiones temáticas dentro de un módulo
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para obtener los subtemas de un módulo ordenados
CREATE INDEX idx_subtopics_module_id ON subtopics(module_id);
CREATE INDEX idx_subtopics_order ON subtopics(module_id, order_index);

-- --------------------------------------------------------------------
-- 6. Sesiones de Clase (class_sessions)
-- Clases individuales que se dictan o están grabadas
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    class_date TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- duración en minutos
    video_url TEXT,
    presentation_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar las consultas de clases por subtema o profesor
CREATE INDEX idx_class_sessions_subtopic_id ON class_sessions(subtopic_id);
CREATE INDEX idx_class_sessions_teacher_id ON class_sessions(teacher_id);
CREATE INDEX idx_class_sessions_order ON class_sessions(subtopic_id, order_index);

-- --------------------------------------------------------------------
-- 7. Recursos Complementarios (resources)
-- Materiales adicionales para una clase (PDFs, enlaces, etc.)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('presentation', 'pdf', 'link', 'video', 'file')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar los recursos de una clase específica
CREATE INDEX idx_resources_class_id ON resources(class_id);
