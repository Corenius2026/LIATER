# Git Workflow Rule

## Directiva de Ejecución Git
1. **Antes de implementar cualquier cambio**:
   - Ejecutar siempre `git pull` (o `git pull --rebase`) para asegurar estar sincronizado con la versión más reciente del repositorio en remoto.

2. **Después de implementar y verificar los cambios**:
   - Agregar los archivos modificados con `git add`.
   - Realizar un commit descriptivo con `git commit -m "..."`.

3. **Invariante: `git pull` obligatorio antes de `git push`**:
   - Inmediatamente antes de realizar `git push`, ejecutar obligatoriamente `git pull` (o `git pull --rebase`) sobre la rama y el remoto activo para integrar cambios remotos recientes y evitar sobreescrituras accidentales.

4. **Publicación final (`git push`)**:
   - Enviar las actualizaciones al repositorio remoto ejecutando `git push` hacia el remoto correspondiente (ej. `juanbeltran main`).
