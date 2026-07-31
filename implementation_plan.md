# Diseño Visual del Entorno de Curso (Mockup)

El objetivo es crear una pantalla de visualización de cursos con estética **premium y moderna**, para que el estudiante consuma el contenido de forma inmersiva (al estilo de plataformas como Platzi, Udemy o MasterClass), antes de conectarlo definitivamente a Supabase.

## Propuesta de Diseño (CourseViewerMock)

Construiremos un nuevo componente `CourseViewerMock.jsx` al que podrás acceder temporalmente mediante una ruta como `/mock-course`.

### Características de la Interfaz
1. **Layout Principal (Grid/Flex)**:
   - **Izquierda (70%)**: Reproductor de video inmersivo. Bordes redondeados, sombra sutil (`glassmorphism`).
   - **Derecha (30%)**: Panel del currículum (Temario). Listado de Subtemas y Clases desplegables (Acordeones).
2. **Estética y UI Premium**:
   - Fondo de página sutilmente matizado (ej. `#f8fafc` o gradiente claro).
   - Uso intensivo de íconos (Lucide-react) para representar el tipo de contenido (Video, Lectura, Recursos).
   - Micro-animaciones en los elementos del temario al hacer *hover*.
   - Indicadores de progreso (Checkmarks circulares, barras de progreso).
3. **Pestañas Interactivas bajo el video**:
   - *Resumen*: Descripción de la clase.
   - *Recursos*: Archivos descargables simulados (PDFs, Enlaces).
   - *Discusión*: Un área de comentarios simulada para interactuar con otros alumnos y el profesor.

## Cambios Propuestos
1. **[NUEVO]** `src/pages/CourseViewerMock.jsx`: El componente principal del mockup con datos quemados (simulados) muy realistas y atractivos.
2. **[MODIFICAR]** `src/App.jsx`: Agregar la ruta `/mock-course` para que puedas visitarla y evaluar el diseño.
3. **[MODIFICAR]** `src/components/Sidebar.jsx`: Agregar un botón temporal "Ver Diseño del Curso" apuntando a `/mock-course` para que puedas llegar a él con un solo clic.

## Pasos de Verificación
1. Crearé los archivos.
2. Te notificaré para que inicies tu entorno de desarrollo (`npm run dev`).
3. Podrás navegar a la vista simulada y darme feedback sobre colores, disposición y animaciones. Una vez lo apruebes, convertiremos este diseño estático en una página dinámica conectada a Supabase para los cursos reales.

> [!IMPORTANT]
> Revisa este plan. ¿Te parece bien esta distribución (video a la izquierda, temario a la derecha) o prefieres algún otro estilo específico para el reproductor del curso?
