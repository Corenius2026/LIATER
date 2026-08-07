# Regla: Mantenimiento de Integraciones Externas

Este proyecto depende de múltiples conexiones a servicios externos (Supabase, Google Drive, Vercel, entre otros). Al crear, modificar o corregir funciones, es obligatorio seguir estas directivas:

1. **Revisar Conexiones Existentes:** Antes de alterar cualquier función que maneje datos o despliegues, verifica cómo interactúa con las integraciones actuales (ej. clientes de Supabase, configuraciones de Vercel, APIs de Drive).
2. **Preservar la Persistencia:** No elimines ni sobrescribas configuraciones de conexión existentes (como las variables de entorno o la instancia secundaria de Supabase para creación de usuarios).
3. **Consistencia al Agregar Nuevas Funciones:** Si necesitas agregar nuevas integraciones o corregir las actuales, hazlo extendiendo la arquitectura existente sin romper la compatibilidad de las funciones que ya dependen de ellas.
