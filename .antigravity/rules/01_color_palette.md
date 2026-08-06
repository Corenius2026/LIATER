# LIATER — Paleta de Colores Obligatoria: Black and Gold Elegance

Todo cambio de diseño visual (CSS inline, clases CSS, variables) en el proyecto LIATER
DEBE usar exclusivamente los siguientes valores de color:

| Rol                | Hex       | Uso principal                                   |
|--------------------|-----------|--------------------------------------------------|
| Blanco puro        | #FFFFFF   | Fondos de tarjetas, textos sobre fondo oscuro    |
| Gris claro         | #E5E5E5   | Fondos secundarios, bordes, separadores          |
| Oro / Ámbar        | #FCA311   | Acentos primarios, CTAs, badges, highlights      |
| Azul marino oscuro | #14213D   | Color de marca principal, encabezados, navbars   |
| Negro              | #000000   | Texto principal, fondos premium oscuros          |

## Reglas estrictas:

- NUNCA usar colores genéricos (rojo puro, verde brillante, azul estándar) como acentos principales.
- NUNCA usar TailwindCSS. Todo el estilo es Vanilla CSS o CSS inline.
- Verificar y alinear las variables CSS existentes con esta paleta antes de cualquier cambio:
  - `--navy` → debe mapear a `#14213D`
  - `--gold` → debe mapear a `#FCA311`
  - `--white` → debe mapear a `#FFFFFF`
  - `--bg-light` / `--border-color` → deben derivar de `#E5E5E5`
- Los estados de error usan rojo solo como señal semántica puntual (no como acento de marca).
- Gradientes permitidos: de `#14213D` a `#000000` (oscuro profundo) o de `#FCA311` a `#e8960a` (oro cálido).
