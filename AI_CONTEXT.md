# Contexto General del Proyecto LIATER (LMS)

## 1. ¿De qué trata el proyecto?
LIATER es una plataforma de gestión de aprendizaje (LMS - Learning Management System) diseñada para administrar diplomados y cursos (actualmente enfocada en un "Diplomado Internacional en Tecnologías de la Información" y "Sistemas Fotovoltaicos").
La plataforma permite la interacción de tres tipos de roles:
- **Administrador**: Tiene control total. Puede crear usuarios en un entorno global, asignar roles, gestionar inscripciones a programas (diplomados), y administrar la estructura de los cursos (módulos, subtemas, clases, profesores, recursos y anuncios).
- **Profesor**: Tiene acceso a un panel docente ("Mi Panel") donde puede gestionar las clases que se le han asignado, subir material de apoyo (recursos) y publicar anuncios para los estudiantes.
- **Estudiante**: Accede a un "Inicio del Curso" (Dashboard) donde puede ver los módulos, acceder al contenido de las clases, ver los recursos disponibles y conocer a sus profesores.

## 2. Stack Tecnológico
- **Frontend**: React.js construido con Vite.
- **Estilos**: CSS puro (`index.css`, `App.css`, y CSS Modules/archivos por componente). No se utiliza TailwindCSS. Se prioriza un diseño moderno, responsivo, con micro-animaciones y "glassmorphism".
- **Backend / Base de Datos**: Supabase (PostgreSQL). Se encarga de la Autenticación (Supabase Auth) y de la base de datos relacional.
- **Enrutamiento**: React Router DOM (`react-router-dom`).
- **Iconografía**: Lucide React (`lucide-react`).

## 3. Arquitectura de la Base de Datos (Supabase)
Las tablas principales son:
1. `users_profile`: Almacena la información extendida de todos los usuarios (ID vinculado a Auth, nombre, email, rol `admin|teacher|student`, estado activo/inactivo).
2. `diploma_programs`: Programas o diplomados disponibles en la plataforma.
3. `modules` y `subtopics`: Estructura jerárquica del contenido académico.
4. `teacher_profiles`: Perfiles públicos de los profesores.
5. `class_sessions`: Clases programadas vinculadas a un subtema y a un profesor.
6. `resources`: Material de apoyo (PDFs, links) subido por administradores o profesores.
7. `announcements`: Avisos creados por profesores para los alumnos.
8. `enrollments`: Tabla pivote que maneja las inscripciones, conectando a un estudiante (`student_id` en `users_profile`) con un programa (`diploma_id`).

*Nota de Seguridad:* Todas las tablas manejan Row Level Security (RLS) en Supabase para proteger los datos según el rol del usuario.

## 4. Estado Actual y Avances (Historial)
- **Gestión de Usuarios Global**: Se extrajo la gestión de usuarios del panel específico de un curso hacia un entorno global (`/users`). Los administradores pueden registrar usuarios, buscar por nombre o correo, visualizar las listas separadas por rol (Alumnos, Profesores, Admins) y gestionar inscripciones.
- **Navegación Dinámica (Sidebar)**: La barra lateral se adapta al contexto. En rutas globales (`/portal`, `/users`, `/perfil`, `/soporte`) muestra menús generales. Al entrar al detalle de un curso, cambia para mostrar el menú específico de aprendizaje/administración del curso.
- **Panel de Administración**: 
  - Muestra un "Resumen" con tarjetas estadísticas. Ahora la tarjeta de "Alumnos" refleja correctamente la cantidad de alumnos *inscritos* al programa en particular (leyendo de `enrollments`), no el total global.
  - Cuenta con pestañas independientes para Alumnos (inscritos al curso), Profesores, Módulos, Subtemas, Clases, Recursos y Anuncios.
  - Se utiliza `Promise.all` para cargar todos los datos de forma síncrona en el panel del administrador.
- **Portal Principal (`/portal`)**: Después del Login, los usuarios llegan a una vista global donde ven a qué programas tienen acceso y un resumen de las próximas clases en agenda.

## 5. Instrucciones para la IA (Continuidad)
- **Diseño**: Mantén un diseño premium. Siempre usa colores modernos, tipografías legibles y asegúrate de que las nuevas interfaces hagan "match" con el estilo actual (tarjetas con bordes sutiles, sombras suaves, estados `:hover`).
- **Supabase**: Al hacer cambios en la base de datos, asegúrate de actualizar el archivo `database/schema.sql`. Si creas tablas nuevas, verifica siempre implementar y documentar las políticas RLS (`Row Level Security`).
- **Contexto**: Antes de implementar una funcionalidad, revisa este archivo y `App.jsx` para entender el árbol de rutas.
- **Git**: Cada vez que se solicite un `commit`, actualiza la sección "Estado Actual y Avances" de este archivo antes de subir el código.
