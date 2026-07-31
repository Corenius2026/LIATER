# Contexto Exhaustivo del Proyecto LIATER (LMS)

## 1. Naturaleza y Propósito del Proyecto
**LIATER** es una plataforma integral de tipo Learning Management System (LMS) orientada a la gestión y entrega de programas académicos (Diplomados, Cursos, Talleres, etc.). Inicialmente enfocada en programas como el "Diplomado Internacional en Tecnologías de la Información" y "Sistemas Fotovoltaicos", la plataforma ahora se ha generalizado para soportar diferentes **tipos de programas** (`program_type`), permitiendo que la interfaz y la lógica de negocio se adapten automáticamente si el programa es un 'diplomado' (extenso) o un 'curso' (corto).

El núcleo de LIATER es proveer un entorno estructurado donde tres tipos de actores (Administradores, Profesores y Estudiantes) puedan interactuar y acceder a recursos, módulos y clases según un sistema de enrutamiento contextual, sin interferir con los permisos de los demás actores, gestionado bajo un flujo centralizado de autenticación.

## 2. Stack Tecnológico y Arquitectura
- **Frontend Core**: `React.js` (versión 18+), inicializado y construido utilizando `Vite` para empaquetado rápido y Hot Module Replacement (HMR).
- **Enrutamiento**: `react-router-dom` v6. Se utiliza un enrutador basado en componentes `<Routes>` y un sistema de rutas protegidas mediante un componente wrapper `<ProtectedRoute>`.
- **Manejo de Estado Global**: Context API nativo de React (`AuthContext.jsx`), utilizado principalmente para propagar el estado de autenticación (el usuario logueado `currentUser` y su rol). Los datos específicos del curso (ej. `programId` y `program_type`) se mantienen en la URL o se respaldan en `localStorage` (`activeProgramId`, `activeProgramType`).
- **Backend / Database as a Service**: **Supabase**. Se aprovechan tres grandes módulos de Supabase:
  1. *Supabase Auth*: Para registro, inicio de sesión y persistencia de sesión segura (Tokens JWT).
  2. *Supabase Database (PostgreSQL)*: Para almacenamiento de datos relacionales, vinculados con consultas RPC y Joins eficientes (`!inner`).
  3. *Row Level Security (RLS)*: Para asegurar que desde el frontend nadie pueda consultar o modificar datos que no le corresponden según su rol.
- **Estilos y UI**:
  - CSS nativo (`App.css`, `index.css`). No se utilizan frameworks utilitarios como TailwindCSS ni librerías de componentes prefabricadas (Material UI, Bootstrap).
  - Se emplea una estética moderna y "premium": Glassmorphism, degradados sutiles, micro-animaciones (hover, transiciones `all 0.3s ease`), y el uso de variables CSS para la paleta de colores moderna, armoniosa y clara.
  - **Iconografía**: `lucide-react` para iconos vectoriales consistentes y modernos.

## 3. Arquitectura de Base de Datos (Esquema PostgreSQL)
La base de datos está normalizada y conectada por llaves foráneas (`UUID`). Todas las tablas tienen políticas estrictas de `RLS` activadas. Las principales son:

### 3.1 Gestión de Usuarios
- `users_profile`: Es la tabla central que se vincula 1 a 1 con la tabla interna `auth.users` de Supabase a través de `id` = `auth.users.id`.
  - `id` (UUID, llave primaria).
  - `full_name`, `email` (copia para lectura rápida).
  - `role` (Restringido por constraint `CHECK` a: `'admin'`, `'teacher'`, `'student'`).
  - `is_active` (Booleano para suspensión suave).
- `teacher_profiles`: Extensión del perfil para profesores, que permite relacionarlos directamente con clases físicas.
  - `id` (UUID, autogenerado).
  - `user_id` (FK a `users_profile`).
  - `name`, `bio`, `area`, `photo_url`, `linkedin_url`.

### 3.2 Estructura Académica y de Contenido
- `diploma_programs`: Representa el contenedor principal de contenido académico (puede ser Diplomado o Curso). 
  - Contiene: `title`, `description`, `thumbnail_url`, `program_type` ('diplomado', 'curso', etc.).
- `modules`: Nivel superior jerárquico. Vinculado al `diploma_programs(id)`. Si el programa es un 'curso' (corto), los módulos actúan como un contenedor "invisible" para mantener la integridad referencial, y la interfaz los oculta.
- `subtopics`: Nivel intermedio. Vinculado a `modules(id)`.
- `class_sessions`: Nivel más granular (las clases físicas, sincrónicas o asincrónicas). 
  - Vinculado a `subtopic_id` y `teacher_id`.
  - Contiene detalles vitales como `class_date`, `duration`, `video_url` (grabación) y `presentation_url`.

### 3.3 Relaciones e Interacciones
- `enrollments`: Tabla pivote de seguridad y acceso. Conecta un `student_id` (FK a `users_profile`) con un `diploma_id` (FK a `diploma_programs`). Si un alumno no está en esta tabla, no tiene acceso ni a los módulos ni a las clases del programa.
- `resources`: Archivos de apoyo subidos por los administradores o profesores.
- `announcements`: Avisos importantes que ven los estudiantes en su Dashboard.

## 4. Flujo de Navegación y Enrutamiento (El "Contexto de Curso")
El sistema implementa una navegación de dos niveles, definida en `App.jsx` y `Sidebar.jsx`:

1. **Rutas Globales (Panel Principal)**:
   - `/portal`: Muestra la cuadrícula de todos los programas a los que el usuario tiene acceso. Al dar clic a un programa, se inyectan `activeProgramId` y `activeProgramType` en `localStorage` y se navega hacia el contexto de ese programa.
   - `/users` (Exclusivo Admin): Área global de **Gestión de Usuarios** (`UserManagement.jsx`). Permite listar, crear o desactivar a TODOS los estudiantes, profesores y admins de forma aislada, así como **inscribirlos** a distintos programas mediante la tabla `enrollments`. 

2. **Rutas Contextuales (Dentro de un Curso/Diplomado)**:
   - Una vez que se entra a un programa, la URL adquiere el `:programId` (ej. `/dashboard/admin/123-456`).
   - La barra lateral (`Sidebar.jsx`) reacciona ocultando el menú global y mostrando únicamente el menú del programa. **Adaptación UI**: Si el `program_type` es `'curso'`, la pestaña de "Módulos" desaparece de la barra lateral, conectando al usuario más rápido a sus temas.
   - *Paneles Específicos*:
     - `Dashboard.jsx`: La página de inicio del programa, renderiza de forma condicional las estadísticas y próximos eventos basándose en el ID del programa actual.
     - `AdminPanel.jsx` (`/dashboard/admin/:programId`): Un gran panel administrativo contextual con pestañas para "Resumen", "Alumnos" (sólo los que están en la tabla `enrollments` con este `diploma_id`), "Profesores", "Módulos", "Subtemas", "Clases".
     - `TeacherPanel.jsx` (`/dashboard/profesor/:programId`): Espacio donde los profesores pueden gestionar las clases que tienen asignadas *exclusivamente* en este programa.

## 5. Decisiones Arquitectónicas Recientes (Historial de Cambios)
1. **Desacoplamiento de la Gestión de Usuarios y el Panel del Curso**:
   - Inicialmente, la administración de usuarios estaba incrustada en el `AdminPanel` bajo la pestaña `UsuariosTab`. Esto generaba confusión semántica porque la pestaña gestionaba TODOS los usuarios de la base de datos (comportamiento global) desde dentro del contexto de un curso específico, rompiendo la lógica de navegación (al hacer clic en "Registrar Usuarios", el sidebar perdía el estado).
   - **Solución**: Se eliminó por completo el `UsuariosTab` de `AdminPanel.jsx`. Ahora, toda la creación e inscripción global se hace a través de `/users` (`UserManagement.jsx`), mientras que dentro de un curso (en `AdminPanel.jsx`), el admin utiliza la pestaña `AlumnosTab` exclusivamente para buscar y visualizar a los alumnos **que ya están inscritos en ese curso**, garantizando consistencia.
2. **Contexto Activo Inteligente**: 
   - Modificación de `Portal.jsx` para almacenar no sólo `activeProgramId` sino también `activeProgramType` ('curso' o 'diplomado') en `localStorage`. Esto permite a `Sidebar.jsx` adaptar su UI instantáneamente (por ejemplo, ocultar el botón de Módulos y renombrar "Inicio del Diplomado" a "Inicio del Curso") sin necesidad de consultas asíncronas lentas a la BD durante la carga de la ruta.
3. **Filtro de Datos Dinámicos con Supabase Joins**: 
   - Se migró toda la lógica de obtención de clases, anuncios y materiales en `AdminPanel` y `TeacherPanel` para usar joins relacionales estrictos (`subtopics!inner(modules!inner(diploma_id))`), asegurando que, incluso para entidades profundamente anidadas como una clase, únicamente se obtengan las que pertenezcan al programa del contexto (`programId`).
4. **Cliente Secundario de Supabase para Creación de Usuarios**: 
   - Para que el Administrador pueda registrar nuevos usuarios mediante `supabase.auth.signUp()` sin que Supabase cierre la sesión actual del administrador y cause deslogueo, se utiliza una instancia secundaria `supabaseCreator` que tiene inhabilitado la persistencia de la sesión.

## 6. Instrucciones y Reglas Futuras para IAs (Code Guidelines)
- **Mantén la Consistencia Visual**: El diseño "premium" es una directiva estricta. Continúa utilizando variables de color modernas (tonos azul oscuro/indigo), sombras suaves (`box-shadow`), interfaces limpias con fondo blanco/gris claro (`#f8fafc`), y mantén márgenes amplios (`gap` generoso).
- **Respeta el Contexto de Curso**: Si implementas una funcionalidad nueva dentro de un panel específico (Ej. Dashboard, Modulos, Clases), asegúrate de que toda consulta de Base de Datos filtre rigurosamente usando `.eq('diploma_id', programId)` de forma directa o indirecta a través de *joins* `!inner`.
- **Eliminación de Código Obsoleto**: Si refactorizas un sistema o descubres código de demostración obsoleto, destrúyelo por completo (como se hizo con `UsuariosTab` dentro de `AdminPanel.jsx`) para que la base de código sea lo más compacta y clara posible.
- **Git Flow Continuo**: Al completar tareas o hitos, asegúrate de actualizar esta documentación exhaustivamente y pushear todo el progreso usando `git add .`, `git commit` y `git push`.
