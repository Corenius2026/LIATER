# Regla: Flujo de Trabajo con Git

Siempre que realices cambios en el código de este repositorio, debes seguir este flujo de trabajo obligatoriamente:

1. **Antes de hacer cualquier cambio**: Ejecuta `git pull` para asegurarte de tener la versión más reciente del repositorio.
2. **Desarrollar y validar**: Implementa y prueba las modificaciones requeridas (`npm run build`).
3. **Commit de los cambios**: Prepara y confirma las modificaciones (`git add ...`, `git commit -m "..."`).
4. **Pull OBLIGATORIO antes de Push**: Inmediatamente antes de ejecutar `git push`, ejecuta siempre `git pull` (o `git pull --rebase` en la rama y remoto activo) para traer e integrar cualquier cambio remoto nuevo y evitar sobrescribir trabajo ajeno.
5. **Push final**: Ejecuta `git push` al remoto correspondiente (ej. `juanbeltran main` en fase de desarrollo).

Esta regla asegura que el repositorio siempre esté sincronizado y libre de conflictos o pérdida de datos.
