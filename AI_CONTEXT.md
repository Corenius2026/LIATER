# Contexto Exhaustivo del Proyecto LIATER (LMS)

## 1. Naturaleza y Propósito del Proyecto
**LIATER** es una plataforma integral de tipo Learning Management System (LMS) orientada a la gestión y entrega de programas académicos (Diplomados, Cursos, etc.). Actualmente, el sistema está siendo configurado alrededor de programas clave como el "Diplomado Internacional en Tecnologías de la Información" y "Sistemas Fotovoltaicos".

El núcleo de LIATER es proveer un entorno estructurado donde tres tipos de actores (Administradores, Profesores y Estudiantes) puedan coexistir en un mismo ecosistema sin interferir con los permisos del otro, todo gestionado bajo un flujo centralizado de autenticación.

## 2. Stack Tecnológico y Arquitectura
- **Frontend Core**: `React.js` (versión 18+), inicializado y construido utilizando `Vite` para empaquetado rápido y Hot Module Replacement (HMR).
- **Enrutamiento**: `react-router-dom` v6. Se utiliza un enrutador basado en componentes `<Routes>` y un sistema de rutas protegidas mediante un componente wrapper `<ProtectedRoute>`.
- **Manejo de Estado Global**: Context API nativo de React (`AuthContext.jsx`), utilizado principalmente para propagar el estado de autenticación (el usuario logueado `currentUser` y su rol).
- **Backend / Database as a Service**: **Supabase**. Se aprovechan tres grandes módulos de Supabase:
  1. *Supabase Auth*: Para registro, inicio de sesión y persistencia de sesión segura (Tokens JWT).
  2. *Supabase Database (PostgreSQL)*: Para almacenamiento de datos relacionales.
  3. *Row Level Security (RLS)*: Para asegurar que desde el frontend nadie pueda consultar o modificar datos que no le corresponden según su rol.
- **Estilos y UI**:
  - CSS nativo (`App.css`, `index.css`). No se utilizan frameworks utilitarios como TailwindCSS ni librerías de componentes prefabricadas (Material UI, Bootstrap).
  - Se emplea una estética moderna y "premium": Glassmorphism, degradados sutiles, micro-animaciones (hover, transiciones `all 0.3s ease`), variables CSS para la paleta de colores.
  - **Iconografía**: `lucide-react` para iconos vectoriales consistentes y modernos.

## 3. Arquitectura de Base de Datos (Esquema PostgreSQL)
La base de datos está normalizada y conectada por llaves foráneas (`UUID`). Las tablas principales son:

### 3.1 Gestión de Usuarios
- `users_profile`: Es la tabla central. Se vincula 1 a 1 con la tabla interna `auth.users` de Supabase a través de `auth_user_id`. Contiene:
  - `id` (UUID, llave primaria).
  - `full_name`, `email` (copia para lectura rápida).
  - `role` (Restringido por constraint `CHECK` a: `'admin'`, `'teacher'`, `'student'`).
  - `is_active` (Booleano para suspensión suave).
- `teacher_profiles`: Extensión del perfil para profesores. Se usa para vincular a los profesores con clases específicas sin comprometer la tabla de usuarios genérica.
  - `id` (UUID).
  - `user_id` (FK a `users_profile`).
  - `name`, `bio`, `specialty`, `avatar_url`.

### 3.2 Estructura Académica (El Contenido)
- `diploma_programs`: Los programas principales (Ej. Diplomado en Energía Solar).
- `modules`: Módulos que pertenecen a un diplomado (`diploma_id`). Tienen un `order_index` para ordenamiento.
- `subtopics`: Subtemas que pertenecen a un módulo (`module_id`). Tienen `order_index`.
- `class_sessions`: Representan las clases físicas o en vivo. Se vinculan a un `subtopic_id` y a un `teacher_id`. Contienen título, descripción, `class_date`, `duration`, `meeting_url` y `recording_url`.

### 3.3 Relaciones e Interacciones
- `enrollments`: Tabla pivote. Conecta un `student_id` (FK a `users_profile`) con un `diploma_id` (FK a `diploma_programs`). Si un alumno no está en esta tabla, no tiene acceso a los cursos.
- `resources`: Archivos o enlaces subidos por administradores o profesores. Se enlazan opcionalmente a un `module_id`, `subtopic_id` o `class_id`.
- `announcements`: Avisos globales o urgentes emitidos por un profesor (`teacher_id`) para los alumnos.

*Todas las tablas tienen políticas estrictas de `RLS` activadas. Por ejemplo: `enrollments` permite `SELECT`, `INSERT` y `DELETE` para cualquier autenticado temporalmente por requerimientos del admin, pero la base general restringe mutaciones solo a roles administradores.*

## 4. Flujo de Navegación y Vistas (Rutas)
El archivo `App.jsx` define el mapa de navegación:

1. **Rutas Públicas**:
   - `/`: Landing page (`Home.jsx`).
   - `/login`: Pantalla de inicio de sesión (`Login.jsx`).
   - `/update-password`: Recuperación/actualización de contraseña.

2. **Rutas Privadas (Envueltas en `<Layout>` con el componente `Sidebar`)**:
   - **Rutas Globales**:
     - `/portal`: El punto de entrada tras hacer login. Muestra los programas a los que el usuario tiene acceso (como estudiante o profesor) y un resumen global.
     - `/perfil`: Vista del perfil personal del usuario logueado.
     - `/soporte`: Área de ayuda técnica.
     - `/users` (Exclusivo Admin): Área de **Gestión de Usuarios Global**. Permite crear alumnos, profesores y admins de forma aislada, buscar por texto, y gestionar a qué diplomados están inscritos (`enrollments`).
   
   - **Rutas de Contexto de Curso**: Cuando el usuario navega hacia el interior de un curso, la barra lateral (`Sidebar`) cambia dinámicamente, ocultando las opciones globales y mostrando las opciones de aprendizaje o administración.
     - *Para Estudiantes*: `/dashboard` (Inicio del curso), `/modules` (Lista de módulos), `/modules/:id`, `/class/:id`, `/teachers`.
     - *Para Profesores*: `/dashboard/profesor` (Panel docente), `/resources` (Gestión de recursos).
     - *Para Administradores*: `/dashboard/admin` (Panel de administración del curso), `/classes`, `/settings`.

## 5. Decisiones Arquitectónicas Clave (Historial de Refactorización)
1. **Desacoplamiento de Gestión de Usuarios**: Inicialmente, la gestión de usuarios residía dentro del Panel de Administración del curso (`/dashboard/admin`). Se detectó que conceptualmente esto era un error, ya que los usuarios existen a nivel de plataforma, no de curso. **Solución**: Se extrajo todo el código a `UserManagement.jsx` en la ruta global `/users`.
2. **Cliente Secundario de Supabase para Creación de Usuarios**: Para que el Administrador pudiera registrar nuevos usuarios usando `supabase.auth.signUp()` sin que Supabase sobreescribiera la sesión actual del administrador (lo que lo deslogueaba), se instanció un `supabaseCreator` secundario (`createClient` con configuración para no persistir sesión).
3. **Métricas de Inscripción Precisas**: En el Panel de Administración del curso (`AdminPanel.jsx`), el dashboard ahora muestra "Alumnos Inscritos" calculando específicamente el tamaño del arreglo de `enrollments`, en lugar del número total global de la plataforma, reflejando así una estadística real.
4. **Limpieza del Repositorio**: Se eliminaron carpetas huérfanas o no utilizadas (`src/data`, `src/auth`, mock files antiguos) para mantener el repositorio limpio y evitar confusiones en futuros desarrollos.

## 6. Instrucciones Futuras para IAs (Code Guidelines)
- **Mantén la Consistencia Visual**: El UI/UX es una prioridad alta para el usuario. No utilices estilos genéricos de navegador. Continúa empleando CSS modularizado, sombras `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`, y esquemas de color definidos en `:root` (e.g. `--primary-color`).
- **Seguridad y Permisos**: Siempre que se agregue una ruta nueva, envuélvela en `<ProtectedRoute allowedRoles={['...']}>` para prevenir escaladas de privilegios. Si alteras la base de datos, siempre asume que RLS está activo y proporciona el SQL correspondiente para dar acceso.
- **Evita Mocks**: El sistema ya está 100% conectado a Supabase. Si necesitas mostrar listas, haz un `SELECT` a la tabla correspondiente.
- **Git Flow**: Cada vez que se te pida subir cambios (commit/push), actualiza la sección 5 ("Decisiones Arquitectónicas Clave") de este archivo (`AI_CONTEXT.md`) para reflejar los últimos desarrollos importantes antes de pushear.
