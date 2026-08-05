# Modelo de Datos - Plataforma LIATER

Este documento detalla el modelo de datos para la plataforma educativa, describiendo las entidades principales, sus campos y relaciones jerárquicas tanto para **Diplomados** (Módulos → Sesiones → Clases) como para **Cursos Cortos** (Sesiones → Clases).

## Entidades y Atributos

### User
Representa a los usuarios del sistema, independientemente de su rol.
* **id**: Identificador único del usuario (PK)
* **name**: Nombre completo
* **email**: Correo electrónico (único)
* **role**: Rol en la plataforma (`student` / `teacher` / `admin`)

### TeacherProfile
Almacena la información pública y profesional específica de los profesores.
* **id**: Identificador único del perfil (PK)
* **user_id**: Referencia al usuario correspondiente (FK -> User.id)
* **name**: Nombre a mostrar (puede ser igual al del User)
* **bio**: Biografía o resumen profesional
* **area**: Área de especialización o materia que imparte
* **photo**: URL de la fotografía de perfil
* **linkedin**: URL del perfil de LinkedIn

### DiplomaProgram
Representa el programa académico principal (diplomado, curso o taller).
* **id**: Identificador único del programa (PK)
* **title**: Título del programa
* **description**: Descripción general del programa
* **program_type**: Tipo de programa (`diplomado`, `curso`, `taller`)
* **start_date**: Fecha de inicio
* **end_date**: Fecha de finalización

### Module
Unidad principal de estructuración para diplomados.
* **id**: Identificador único del módulo (PK)
* **program_id** / **diploma_id**: Referencia al programa al que pertenece (FK -> DiplomaProgram.id)
* **title**: Título del módulo
* **description**: Breve descripción o alcance del módulo
* **order_index**: Posición o secuencia del módulo (ej. 1, 2, 3...)

### Session (Tabla `sessions`, con fallback legacy `subtopics`)
Estructuración de sesiones temáticas dentro de un módulo (diplomados) o directamente del programa (cursos).
* **id**: Identificador único de la sesión (PK)
* **module_id**: Referencia al módulo padre (FK -> Module.id, opcional/null para cursos)
* **program_id**: Referencia directa al programa (FK -> DiplomaProgram.id)
* **title**: Título de la sesión
* **description**: Descripción de los contenidos a tratar
* **order_index**: Posición o secuencia de la sesión dentro del módulo/programa

### ClassSession
Representa una clase específica, ya sea en vivo o grabada.
* **id**: Identificador único de la clase (PK)
* **session_id**: Referencia a la sesión correspondiente (FK -> Session.id)
* **program_id**: Referencia al programa (FK -> DiplomaProgram.id)
* **teacher_id**: Referencia al profesor que imparte la clase (FK -> TeacherProfile.id)
* **title**: Título o tema específico de la clase
* **description**: Resumen de los puntos tratados
* **class_date**: Fecha y hora programada o en la que se impartió
* **video_url**: Enlace a la grabación de la clase
* **meet_url**: Enlace a la sala virtual en vivo (Meet / Zoom)
* **duration**: Duración de la clase (en minutos)
* **order_index**: Posición o secuencia de la clase dentro de la sesión

### Resource
Materiales de apoyo asociados a una clase o módulo específico (presentaciones, lecturas, etc.).
* **id**: Identificador único del recurso (PK)
* **class_id**: Referencia a la clase asociada (FK -> ClassSession.id)
* **module_id**: Referencia al módulo (opcional)
* **title**: Nombre del archivo o recurso
* **resource_type**: Tipo de recurso (`pdf`, `slides`, `link`, `doc`, `zip`, etc.)
* **url**: Enlace de descarga o acceso al recurso

---

## Jerarquía y Relaciones

### 1. Diplomados
`DiplomaProgram` → `Module` (1:N) → `Session` (1:N) → `ClassSession` (1:N) → `Resource` (1:N)

### 2. Cursos Cortos
`DiplomaProgram` → `Session` (1:N) → `ClassSession` (1:N) → `Resource` (1:N)

### Relaciones Clave:
1. **User - TeacherProfile (1:1)**: Un usuario con rol `teacher` tiene un único perfil de profesor asociado.
2. **TeacherProfile - ClassSession (1:N)**: Un profesor puede impartir múltiples clases a lo largo del programa.
3. **ClassSession - Resource (1:N)**: Cada clase puede tener adjuntos múltiples recursos de estudio (diapositivas, lecturas, grabaciones).
