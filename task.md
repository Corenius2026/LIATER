# Tareas de Implementación: Cursos y Arquitectura Multiprograma

- [x] **Base de Datos**
  - [x] Proveer al usuario el script SQL para agregar la columna `program_type` a `diploma_programs`.

- [x] **Enrutamiento y Portal**
  - [x] Actualizar `App.jsx` para soportar rutas con `:programId` (`/dashboard/:programId`, `/dashboard/admin/:programId`, `/dashboard/profesor/:programId`).
  - [x] Actualizar `Portal.jsx` para incluir modal de creación de Programas (Diplomado o Curso). Al crear un Curso, crear automáticamente su "Módulo Invisible" por debajo.
  - [x] En `Portal.jsx`, actualizar los enlaces de los botones de los programas para inyectar el ID (`/dashboard/admin/12345`).

- [x] **Componentes de Interfaz**
  - [x] Refactorizar `Sidebar.jsx` para que reciba y utilice el `programId` al generar los enlaces (Inicio del curso, Módulos, etc.).

- [x] **Paneles de Contexto de Curso**
  - [x] Refactorizar `AdminPanel.jsx` para extraer el `:programId` de la URL, filtrar todas las consultas, y ocultar la pestaña "Módulos" si el tipo es `curso`.
  - [x] Refactorizar `TeacherPanel.jsx` (y la parte de creación de clases/anuncios) para que funcione con el nuevo esquema de parámetros y omita la jerarquía de módulos para los cursos.
  - [x] Refactorizar `Dashboard.jsx` (Vista del estudiante) para capturar `:programId`, consultar los temas correctamente, y saltarse la vista de selección de módulos para los cursos.

- [x] **Gestión de Usuarios y Limpieza**
  - [x] Ocultar la pestaña "Módulos" dinámicamente en el `Sidebar.jsx` usando `activeProgramType`.
  - [x] Eliminar el redundante `UsuariosTab` de `AdminPanel.jsx` para evitar confusiones de contexto.
  - [x] Asegurar que las inscripciones se manejan desde la ruta global `/users` (`UserManagement.jsx`) y el listado de alumnos inscritos en un curso se consulta en la pestaña `Alumnos` del curso.
  - [x] Actualizar exhaustivamente la documentación en `AI_CONTEXT.md` y guardar el estado en Git.
