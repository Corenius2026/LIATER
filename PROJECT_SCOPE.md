# Alcance del Proyecto: Plataforma Web LIATER (Diplomados y Cursos)

## Objetivo del Proyecto
Desarrollar una plataforma web centralizada para organizar, gestionar y distribuir la información y los recursos de diplomados y cursos cortos. La plataforma sirve como punto de acceso único para estudiantes, profesores y administradores, facilitando el acceso estructurado a los módulos, sesiones, clases y materiales asociados (presentaciones, grabaciones, quizes y tareas).

## Roles de Usuario
La plataforma cuenta con tres tipos principales de usuarios:
1. **Estudiante**: Usuario que consume el contenido académico.
2. **Profesor**: Usuario encargado de impartir las clases y compartir su material.
3. **Administrador**: Usuario responsable de la gestión general de la plataforma, usuarios y estructura académica.

## Funciones de cada Rol

### Estudiante
- Iniciar sesión en la plataforma.
- Navegar por la estructura del programa (Módulos y Sesiones para Diplomados; Sesiones directas para Cursos).
- Acceder a los detalles de cada clase.
- Visualizar y descargar el material de apoyo (presentaciones, PDFs).
- Reproducir las grabaciones de las clases impartidas.
- Consultar información sobre los profesores que imparten las clases.

### Profesor
- Iniciar sesión en la plataforma.
- Visualizar el listado de las clases que tiene asignadas agrupadas por Módulo y Sesión.
- Subir y gestionar el material didáctico de sus clases (presentaciones, enlaces de grabación).
- Crear y calificar tareas/entregables y evaluaciones.

### Administrador
- Iniciar sesión en la plataforma.
- Gestión de Usuarios: Crear, editar y matricular Estudiantes y Profesores en programas específicos.
- Gestión de la Estructura: Crear y organizar módulos y sesiones.
- Gestión de Clases: Programar clases y ubicarlas dentro de las sesiones correspondientes.
- Asignación: Vincular profesores específicos a las clases programadas.
- Moderación: Capacidad para gestionar (subir, editar, eliminar) cualquier recurso, sesión o grabación.

## Organización de la Información

### 1. Diplomados
- **Programa (Diplomado)**
  - **Módulos**
    - **Sesiones**
      - **Clases**
        - **Profesores** (Asignados a la clase)
        - **Recursos** (Material de apoyo)
        - **Grabaciones** (Video de la sesión)

### 2. Cursos Cortos
- **Programa (Curso)**
  - **Sesiones**
    - **Clases**
      - **Profesores**
      - **Recursos**
      - **Grabaciones**

## Páginas Principales
1. **Login**: Pantalla de autenticación y redirección contextual por rol.
2. **Portal**: Panorama general para administradores con métricas globales, selector de programa y creación de programas.
3. **Dashboard del Programa**: Vista general del programa activo para estudiantes.
4. **Temario / Módulos**: Vista de navegación por módulos y sesiones.
5. **Detalle de Módulo/Sesión**: Listado interactivo de las clases.
6. **Página de la Clase**: Espacio de la clase con reproductor de video, material didáctico y preguntas/foro.
7. **Panel de Administración**: Gestión integral por pestañas (Resumen, Alumnos, Profesores, Módulos, Sesiones, Clases, Recursos, Anuncios).
8. **Panel del Profesor**: Espacio dedicado para que los docentes gestionen sus clases y materiales.
