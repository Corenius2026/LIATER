# LIATER — Checklist Obligatorio de Supabase Antes de Cualquier Implementación

Antes de generar cualquier prompt de implementación para el Ejecutor que involucre
lectura o escritura de datos en Supabase, responder EXPLÍCITAMENTE las siguientes preguntas.
El prompt del Ejecutor SIEMPRE debe incluir una sección "## Cambios en Supabase" ANTES del código React/JSX.

---

## Checklist de 5 Puntos

### 1. ¿TABLAS EXISTENTES?
Verificar si las tablas necesarias ya existen en `schema.sql` o en `/migrations/`.

Tablas disponibles en el proyecto:
- `users_profile` — Perfiles de todos los usuarios (admin / teacher / student)
- `teacher_profiles` — Extensión de perfil para profesores (FK → users_profile)
- `diploma_programs` — Programas académicos (Diplomado / Curso)
- `modules` — Módulos del programa (FK → diploma_programs)
- `subtopics` — Secciones / subtemas (FK → modules)
- `class_sessions` — Clases individuales (FK → subtopics, teacher_profiles)
- `resources` — Archivos y links de apoyo (FK → class_sessions)
- `announcements` — Avisos del programa (FK → diploma_programs, teacher_profiles)
- `enrollments` — Inscripciones de estudiantes (FK → users_profile, diploma_programs)
- `assignments` — Tareas/entregables (FK → diploma_programs)
- `assignment_submissions` — Entregas de tareas (FK → assignments, users_profile)
- `quizzes` — Cuestionarios (FK → diploma_programs)
- `quiz_submissions` — Respuestas de cuestionarios (FK → quizzes, users_profile)
- `activity_drafts` — Borradores IA generados por transcripción (FK → class_sessions)
- `class_doubts` — Dudas de estudiantes por clase (FK → class_sessions, users_profile)

### 2. ¿COLUMNAS FALTANTES?
Si la funcionalidad requiere una columna que no existe en el esquema actual →
GENERAR el `ALTER TABLE` correspondiente como nueva migración en `/migrations/`.
Nombrar el archivo: `YYYYMMDD_descripcion_corta.sql`.

### 3. ¿RLS POLICIES?
Verificar que las políticas de Row Level Security permiten la operación para el rol correcto:
- `admin`: acceso total (SELECT, INSERT, UPDATE, DELETE) a casi todas las tablas.
- `teacher`: acceso a sus propias clases, recursos, anuncios y borradores IA.
- `student`: acceso de solo lectura a clases, recursos y anuncios de sus programas inscritos.

Si falta una policy → incluir `CREATE POLICY` en la sección "Cambios en Supabase" del prompt.

### 4. ¿JOINS CORRECTOS?
Toda consulta a datos dentro de un programa DEBE filtrar por `program_id` de forma directa
o mediante joins `!inner` para garantizar aislamiento de datos por contexto:

```js
// ✅ CORRECTO — filtro directo
supabase.from('class_sessions').select('*').eq('program_id', programId)

// ✅ CORRECTO — join !inner para entidades anidadas
supabase.from('resources')
  .select('*, class_sessions!inner(program_id)')
  .eq('class_sessions.program_id', programId)

// ❌ INCORRECTO — sin filtro de programa (devuelve datos de TODOS los programas)
supabase.from('class_sessions').select('*')
```

### 5. ¿CLIENTE CORRECTO DE SUPABASE?
- **Operaciones normales** (lectura, actualización, eliminación): usar `supabase` (cliente estándar con sesión persistida).
- **Creación de nuevos usuarios** (`supabase.auth.signUp()`): usar `supabaseCreator` (instancia secundaria sin persistencia de sesión) para evitar el logout del administrador actual.

---

## Formato obligatorio del prompt para el Ejecutor

```
## Cambios en Supabase
[Listar aquí TODAS las migraciones SQL necesarias, o escribir "Ninguno — tablas y policies existentes son suficientes"]

## Cambios en el Frontend
[Código React/JSX aquí]
```
