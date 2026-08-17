# 📄 Documentación Técnica: Integración de Google Drive en Portal LIATER

**Proyecto:** Portal Educativo LIATER — Universidad Nacional de Colombia  
**Fecha de Implementación:** Agosto 2026  
**Tecnologías:** React 19, Supabase (PostgreSQL + Edge Functions Deno), Google Drive API v3, Google OAuth 2.0  

---

## 1. 🎯 Objetivo del Sistema

Permitir que los **profesores suban archivos PDF y presentaciones directamente desde la plataforma web** mediante una zona de arrastrar y soltar (*Drag & Drop*), depositándolos automáticamente dentro de la **carpeta de Google Drive del curso** con una **nomenclatura estandarizada**, otorgando permisos públicos de lectura para que los **estudiantes los visualicen incrustados en un visor `<iframe>` sin consumir cuota de egreso (*egress*) en Supabase ni requerir permisos manuales de Google**.

```
[ Profesor en LIATER ]
        │ (Arrastra PDF)
        ▼
[ Supabase Edge Function: upload-pdf-drive ]
        │ (Firma con OAuth 2.0 Refresh Token)
        ▼
[ Google Drive API v3 ] ──► Guarda en: [ Carpeta del Curso ]
        │ (Aplica Nomenclatura: [Clase 01 - Titulo] Archivo.pdf)
        │ (Asigna Permiso Público de Lectura)
        ▼
[ Base de Datos Supabase ] ──► Guarda enlace en: `resources` y `class_sessions`
        │
        ▼
[ Estudiante en Clase ] ──► Visualiza en `<iframe>` (drive.google.com/file/d/.../preview)
```

---

## 2. 🏛️ Arquitectura y Componentes Implementados

### 2.1 Backend: Edge Function (`upload-pdf-drive`)
* **Ubicación:** `supabase/functions/upload-pdf-drive/index.ts`
* **Entorno:** Deno Edge Runtime en Supabase Cloud.
* **Flujo de Ejecución:**
  1. **Autenticación OAuth 2.0:** Lee `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN` desde los Secrets de Supabase y obtiene un `access_token` fresco ante Google OAuth2 (`https://oauth2.googleapis.com/token`).
  2. **Resolución de la Carpeta:** Consulta la clase en la tabla `class_sessions`. Si la clase no tiene carpeta específica, consulta la carpeta global del curso en `diploma_programs.drive_folder_id`.
  3. **Validación de Carpeta:** Si no existe carpeta vinculada, rechaza la solicitud de forma segura con un mensaje descriptivo para evitar archivos huérfanos.
  4. **Nomenclatura Automática:** Genera el nombre del archivo con el formato:
     $$\text{[Clase 0X - Título de la Clase]} \text{ NombreOriginal.pdf}$$
  5. **Subida Multipart:** Transfiere el binario a Google Drive API v3 (`/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`).
  6. **Permisos Públicos:** Llama al endpoint de permisos de Drive asignando rol `reader` y tipo `anyone`.
  7. **Persistencia:** Inserta el registro en la tabla `resources` y actualiza `class_sessions.presentation_url` con la URL de previsualización (`https://drive.google.com/file/d/{fileId}/preview`).

---

### 2.2 Panel de Administración: Configuración del Curso
* **Componente:** `src/components/admin/AdminSettingsTab.jsx`
* **Funcionalidad:**
  * Campo destacado: **`Carpeta Principal de Google Drive (Materiales y PDFs)`**.
  * Permite al administrador pegar el enlace completo de la carpeta de Drive (ej: `https://drive.google.com/drive/folders/1ABC_XYZ...`) o únicamente su ID.
  * Almacena el valor en la columna `drive_folder_id` de la tabla `diploma_programs`.

---

### 2.3 Panel del Profesor: Subida de Materiales
* **Componente:** `src/pages/TeacherPanel.jsx` (Dentro de `ClassDetailModal` en la sección *Pre-Clase*).
* **Funcionalidad:**
  * **Pestaña 1 (📤 Subir PDF a Google Drive):**
    * Zona de arrastre interactiva (*Drag & Drop*) con soporte para archivos de hasta 100MB.
    * Detector visual de tamaño y nombre del archivo.
    * Vista previa en tiempo real de la nomenclatura con la que se guardará en Drive.
    * Botón de subida con indicador de carga (*spinner*) y bloqueo para prevenir envíos duplicados.
  * **Pestaña 2 (🔗 Pegar Enlace Manual):**
    * Opción alternativa para vincular enlaces externos existentes (Canva, OneDrive, etc.).

---

### 2.4 Panel del Estudiante: Visualizador Embebido
* **Componente:** `src/pages/ClassDetail.jsx`
* **Funcionalidad:**
  * Los recursos y presentaciones con enlaces de Google Drive se transforman automáticamente a formato `/preview`.
  * Se incrustan dentro de un `<iframe>` responsive con aceleración por hardware.
  * **Consumo de egreso en Supabase: 0 bytes** (el tráfico lo asumen directamente los servidores de Google).

---

## 3. 🔐 Configuración de Credenciales y Seguridad

### 3.1 Google Cloud Platform (GCP)
* **Proyecto:** `LIATER-Drive-Uploader`
* **Cuenta Propietaria:** `diplomado_fibog@unal.edu.co`
* **API Habilitada:** Google Drive API v3
* **Tipo de Credencial:** ID de cliente de OAuth 2.0 (Aplicación web)
* **URI de Redireccionamiento:** `https://developers.google.com/oauthplayground`

### 3.2 Secrets Configurados en Supabase Cloud
| Nombre del Secret | Descripción |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` | Identificador de cliente OAuth (`...apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Secreto de cliente OAuth |
| `GOOGLE_REFRESH_TOKEN` | Token de actualización permanente (`1//...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave maestra de Supabase para operaciones del backend |

---

## 4. 📋 Guía Rápida de Uso para Administradores

1. **Crear la Carpeta en Google Drive:**
   * Entra a tu Google Drive institucional con la cuenta `diplomado_fibog@unal.edu.co`.
   * Crea una carpeta para el curso (ej: *Materiales - Curso Iluminación Deportiva*).
   * Copia el enlace de la carpeta.

2. **Vincular la Carpeta al Curso en LIATER:**
   * Entra a LIATER como Administrador.
   * Ve al curso $\rightarrow$ Pestaña **Configuración**.
   * Pega el enlace en **`Carpeta Principal de Google Drive (Materiales y PDFs)`** y haz clic en **"Guardar Cambios"**.

3. **Subida por parte de Profesores:**
   * Los profesores entrarán a **Mis Clases** $\rightarrow$ **Gestionar Clase** $\rightarrow$ **Cargar Presentación / Material**.
   * Arrastran su PDF y le dan a **"Subir a Google Drive"**.
   * ¡Listo! El archivo aparecerá inmediatamente en la carpeta de Drive del curso y quedará visible para todos los estudiantes.

---

## 5. 🛠️ Solución de Problemas Frecuentes (FAQ)

### ¿Qué pasa si el profesor intenta subir un archivo pero el administrador no ha vinculado la carpeta?
La plataforma detiene la subida y muestra una alerta: *"No se ha configurado la carpeta de Google Drive para este curso. El administrador debe vincular el enlace de la carpeta en la pestaña 'Configuración' del curso."*

### ¿Por qué se utilizó OAuth 2.0 con Refresh Token en lugar de una Cuenta de Servicio estándar?
Las cuentas de servicio (*Service Accounts*) no tienen cuota de almacenamiento personal asignada por Google (0 GB). Al utilizar OAuth 2.0 con Refresh Token de la cuenta institucional `diplomado_fibog@unal.edu.co`, el almacenamiento se descuenta de la cuota real de la Universidad Nacional, permitiendo subir archivos sin bloqueos ni errores de cuota.

### ¿Cómo actualizar el código de la Edge Function en el futuro?
En la consola local de LIATER:
```bash
npx supabase functions deploy upload-pdf-drive --project-ref dbxkmasucybamylpkndm --no-verify-jwt
```
O directamente desde el editor web de Supabase en la sección **Edge Functions $\rightarrow$ `upload-pdf-drive`**.
