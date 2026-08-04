# Git Workflow Rule

## Directiva de Ejecución Git
1. **Antes de implementar cualquier cambio**:
   - Ejecutar siempre `git pull` (o `git pull --rebase`) para asegurar estar sincronizado con la versión más reciente del repositorio en remoto.

2. **Después de implementar y verificar los cambios**:
   - Agregar los archivos modificados con `git add`.
   - Realizar un commit descriptivo con `git commit -m "..."`.
   - Enviar las actualizaciones al repositorio remoto ejecutando `git push`.
