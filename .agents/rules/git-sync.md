# Regla de Sincronización Git Multi-PC

## Contexto
Este proyecto se desarrolla activamente desde múltiples computadores o estaciones de trabajo.

## Reglas Obligatorias de Flujo de Trabajo:
1. **Sincronizar antes de modificar (`git pull`)**:
   - Siempre que se vaya a realizar una modificación en el código o antes de iniciar nuevas tareas/commits, ejecutar `git pull` para traer los últimos cambios del repositorio remoto y evitar conflictos.
2. **Sincronizar SIEMPRE antes de publicar (`git pull` previo a `git push`)**:
   - **Regla Crítica**: Justo antes de ejecutar cualquier `git push`, es mandatorio ejecutar primero `git pull` (o `git pull --rebase` en el remoto activo) para asegurar que ninguna estación remota haya subido cambios en el intermedio, evitando eliminar o sobrescribir trabajo.
3. **Publicar cambios al finalizar (`git push`)**:
   - Una vez aplicados, verificados con build y asegurado el pull previo, realizar `git add`, `git commit` y `git push` inmediatamente al remoto correspondiente (ej. `juanbeltran` durante la fase de desarrollo).
4. **Prevenir y resolver conflictos**:
   - Si existen cambios entrantes en el remoto durante un pull, integrarlos limpiamente antes de continuar y verificar el build.
