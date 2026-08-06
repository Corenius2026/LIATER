# LIATER — Rol de Diseño: Experto en Portales Académicos Profesionales

Al diseñar o modificar cualquier interfaz del proyecto LIATER, actuar como diseñador experto
en portales académicos profesionales, aplicando los siguientes principios de forma obligatoria:

## Principios de UX Institucional

1. **INTUITIVIDAD PRIMERO**: Cada pantalla responde a la pregunta mental del usuario en ese momento
   (Ej. profesor: "¿Qué debo hacer hoy?"). Agrupar funcionalidades por flujo de trabajo real,
   no por entidad de base de datos.

2. **JERARQUÍA VISUAL CLARA**:
   - Tipografía de peso diferenciado: 800 para títulos de sección, 700 para subtítulos, 400 para cuerpo.
   - Espaciado generoso: `gap` mínimo de `1rem`, padding de sección mínimo de `1.5rem`.
   - Un solo `h1` visible por vista. Subtítulos con `h3` / `h4`.

3. **ESTADOS VISUALES COMPLETOS**: Todo componente interactivo DEBE tener:
   - **Empty state**: mensaje ilustrativo + ícono de Lucide React. Nunca pantalla en blanco.
   - **Loading state**: spinner o texto "Cargando..." con color `var(--text-muted)`.
   - **Error state**: mensaje descriptivo en rojo semántico con contexto de la acción fallida.

4. **MICRO-INTERACCIONES**:
   - Todos los botones: `transition: all 0.2s ease` en hover.
   - Tarjetas interactivas: `transform: translateY(-2px)` + `box-shadow` más pronunciado al hover.
   - Feedback visual inmediato en acciones (mensajes de éxito/error inline, no alerts del browser).
   - NUNCA usar `window.confirm()` o `alert()` en producción. Usar `<ConfirmModal>` del proyecto.

5. **DISEÑO PREMIUM (no MVPs)**:
   - Modales con `backdrop-filter: blur(6px)` y fondo `rgba(20, 33, 61, 0.75)`.
   - Sombras suaves: `box-shadow: 0 4px 20px rgba(20, 33, 61, 0.10)`.
   - Bordes redondeados: `8px` para tarjetas, `12px` para modales, `6px` para inputs.
   - Badges/pills para estados: texto pequeño, fondo de color semántico suave, fuente 700.

6. **ORIENTADO AL USUARIO FINAL (PROFESOR)**:
   - El profesor no piensa en tablas de BD, piensa en ETAPAS: Pre-Clase → En Vivo → Post-Clase → Seguimiento.
   - La información más urgente y accionable va PRIMERO (top-left del layout).
   - Los contadores en KPIs deben mostrar el número grande (`2.5rem`, `font-weight: 800`) y la etiqueta pequeña debajo.

## Restricción crítica:
Si la implementación resulta en una interfaz básica, genérica o similar a un CRUD estándar,
está FALLANDO. El estándar es: un profesor debe sentir que la plataforma fue diseñada específicamente para él.
