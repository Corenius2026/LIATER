# Roles del Ecosistema y Reglas de Arquitectura

## 1. División de Roles Multi-Agente
- **Chat Planificador / Arquitecto y Corrector (Este Agente)**:
  - Analiza el estado del proyecto, diagnostica discrepancias e incoherencias de datos/UI.
  - Formula planes de implementación y resuelve bugs en el código.
  - Prepara resúmenes ejecutivos y directivas estructuradas con comandos Git para el chat ejecutor.
- **Chat Ejecutor**:
  - Encargado de la sincronización de control de versiones: `git pull` → verificar cambios → `git add` → `git commit` → `git push`.

## 2. Invariantes de Esquema de Base de Datos
- **Módulos**: La tabla se llama `modules` (NUNCA `course_modules`).
- **Jerarquía de Clases**: `Programa > Módulo > Sesión > Clase`.
  - La tabla `class_sessions` se relaciona mediante `sessions(id, title, order_index, module_id, modules(id, title, program_id))`.
- **Reforzamiento IA**:
  - `activity_drafts`: Contiene los borradores generados automáticamente (`status`: `'pending'`, `'approved'`, `'rejected'`).
  - `class_activities`: Contiene la actividad publicada (`is_published`: `true`/`false`).
  - `activity_attempts`: Contiene los intentos y puntajes completados por los estudiantes.

## 3. Estados del Reforzamiento IA
- **Borrador por validar**: `activity_drafts.status = 'pending'` y `class_activities.is_published = false` (Contador: 1 Borrador por validar, 0 Publicadas).
- **Actividad publicada**: `class_activities.is_published = true` (Contador: 1 Publicada, 0 Borradores).
- **Métricas de analítica**: Calculadas reactivamente sobre los registros completados en `activity_attempts`.
