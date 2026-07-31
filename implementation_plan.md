# Soporte para "Cursos" (Sin Módulos) y Multiprograma

Actualmente, la plataforma está estructurada de forma rígida para manejar un solo "Diplomado" global (el Panel de Administrador, Profesor y Alumno no distinguen entre un programa y otro en la URL). Además, la base de datos exige que todo tema pertenezca a un "Módulo".

Para permitir crear "Cursos" más cortos (sin módulos) y sentar las bases para manejar múltiples programas a la vez, propongo la siguiente arquitectura (Enfoque Suave o "Soft Approach").

## User Review Required

> [!WARNING]
> **Decisión Arquitectónica Importante**
> Actualmente, cuando entras al Panel de Admin, no se filtra por qué programa estás viendo, se cargan todos los módulos. Si vamos a tener Diplomados y Cursos coexistiendo, **la plataforma necesita saber en cuál estás adentro**. 
> Propongo cambiar las rutas para que incluyan el ID del programa (Ej: `/dashboard/admin/:programId`). ¿Estás de acuerdo con este cambio fundamental para poder administrar cada curso por separado?

> [!TIP]
> **El Enfoque del "Módulo Invisible" (Recomendado)**
> En lugar de romper toda la base de datos creando tablas paralelas para cursos (`cursos`, `temas_cursos`, etc.), propongo agregar un campo `program_type` (`diplomado` o `curso`) a la tabla actual de programas.
> Cuando el admin crea un "Curso", el sistema creará automáticamente bajo la mesa un **único módulo invisible** llamado "Contenido del Curso". 
> En los Paneles (Admin, Profesor, Alumno), si el programa es de tipo `curso`, **ocultaremos por completo la pestaña y las referencias a "Módulos"**, conectando visualmente los "Subtemas" directamente al Curso. Esto ahorra semanas de desarrollo y mantiene la base de datos limpia y estable. ¿Te parece bien este enfoque?

## Proposed Changes

### Base de Datos (`database/schema.sql`)
- Agregar una columna `program_type VARCHAR(50) DEFAULT 'diplomado'` a la tabla `diploma_programs`.
- Generar el script SQL para que actualices tu Supabase.

### Rutas (`App.jsx` y `Sidebar.jsx`)
#### [MODIFY] src/App.jsx
- Cambiar las rutas estáticas por rutas dinámicas que acepten el ID del programa:
  - `/dashboard/admin/:programId`
  - `/dashboard/profesor/:programId`
  - `/dashboard/:programId` (Estudiantes)

#### [MODIFY] src/components/Sidebar.jsx
- Actualizar los enlaces laterales (Ej: "Inicio del Curso", "Módulos", "Profesores") para que usen el `programId` actual y mantengan al usuario dentro del contexto de ese curso en particular.

### Portal Principal
#### [MODIFY] src/pages/Portal.jsx
- Actualizar el botón "Administrar" (y equivalentes de profesor/alumno) para que redirija a la URL correcta usando el ID del programa seleccionado (`/dashboard/admin/${dip.id}`).
- Añadir un botón para **Crear Programa** (Diplomado o Curso) para que el Admin pueda generar nuevos cursos desde aquí.

### Paneles de Curso (Admin, Profesor, Alumno)
#### [MODIFY] src/pages/AdminPanel.jsx
- Capturar el `programId` de la URL (`useParams`).
- Filtrar todas las consultas a Supabase (`modules`, `subtopics`, `class_sessions`) para que solo traigan la información de ESE programa en específico.
- **Lógica de Curso vs Diplomado**: Leer el `program_type`. Si es `'curso'`, ocultar por completo la pestaña de `Módulos` del panel. Al crear un "Subtema", asignarlo automáticamente al "Módulo Invisible" de ese curso.

#### [MODIFY] src/pages/TeacherPanel.jsx y src/pages/Dashboard.jsx
- Capturar el `programId` de la URL.
- Si es un `'curso'`, saltarse la vista de selección de Módulos y mostrar directamente la lista de Subtemas (o Temas) y sus Clases.

## Verification Plan

### Manual Verification
1. Entrar con rol Admin al `/portal`. Crear un "Curso" nuevo.
2. Hacer clic en "Administrar" el nuevo curso. Verificar que la URL cambie a `/dashboard/admin/ID-DEL-CURSO`.
3. Verificar que en la barra superior o pestañas NO exista la opción de crear "Módulos".
4. Crear un "Subtema" y una "Clase" para el curso.
5. Iniciar sesión como alumno inscrito a ese curso, entrar a su Dashboard y verificar que ve los temas directamente sin pasar por módulos.
