# Regla de Sincronización Git Multi-PC

## Contexto
Este proyecto se desarrolla activamente desde múltiples computadores o estaciones de trabajo.

## Reglas Obligatorias de Flujo de Trabajo:
1. **Sincronizar antes de modificar (`git pull`)**:
   - Siempre que se vaya a realizar una modificación en el código o antes de iniciar nuevas tareas/commits, ejecutar `git pull` para traer los últimos cambios del repositorio remoto y evitar conflictos.
2. **Publicar cambios al finalizar (`git push`)**:
   - Una vez aplicados y verificados los cambios solicitados por el usuario, realizar `git add`, `git commit` con un mensaje descriptivo y `git push` inmediatamente para que la otra estación de trabajo siempre tenga la versión más reciente.
3. **Prevenir y resolver conflictos**:
   - Si existen cambios entrantes en el remoto durante un pull, integrarlos limpiamente antes de continuar.
