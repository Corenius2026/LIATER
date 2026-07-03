# Contexto de Desarrollo - Plataforma del Diplomado

Este documento sirve como bitácora y guía de contexto para desarrolladores e Inteligencias Artificiales (IAs) que continúen trabajando en esta plataforma.

---

## 📌 Información General
* **Ubicación local:** `d:\Universidad\LIATER`
* **Tecnologías principales:** React (JSX), Vite, React Router DOM, Lucide-React, CSS puro.
* **Estado de persistencia:** Se utiliza `localStorage` para simular y mantener sesiones activas y la creación de nuevos usuarios sin necesidad de una base de datos física conectada todavía.

---

## 🔑 Sistema de Autenticación Real (Persistido)
Se implementó un flujo completo de autenticación y protección de rutas en el frontend:
* **Contexto global:** `src/context/AuthContext.jsx` expone `currentUser`, `login()`, `logout()`, `registerUser()`, y la lista reactiva de `users`.
* **Guardia de rutas:** `src/components/ProtectedRoute.jsx` bloquea accesos no autenticados y redirige de manera segura a `/login`. También restringe accesos por roles permitidos (`allowedRoles`).
* **Credenciales de Prueba Iniciales:**
  * **Administrador:** `admin@diplomado.com` / `admin123`
  * **Profesor:** `roberto@diplomado.edu` / `roberto123`
  * **Estudiante:** `juan@estudiante.edu` / `juan123`

### 🔄 Redirecciones por Rol al Iniciar Sesión
* Estudiante (`student`) ➔ `/dashboard`
* Profesor (`teacher`) ➔ `/dashboard/profesor`
* Administrador (`admin`) ➔ `/dashboard/admin`

---

## 💻 Interfaces y Estructura de Páginas

### 1. Panel del Administrador (`/dashboard/admin`)
* **Ubicación:** `src/pages/AdminPanel.jsx` (Estilos en `AdminPanel.css`).
* **Estructura:** Dividido en 7 pestañas organizadas:
  1. **Resumen:** Estadísticas generales (total usuarios, profesores, clases) y alertas de próximas sesiones.
  2. **Usuarios:** Tabla reactiva con la base de datos de usuarios de `localStorage`. Cuenta con un **formulario de creación funcional** que permite registrar nuevos estudiantes, profesores o administradores.
  3. **Profesores:** Vista de tarjetas con perfiles y bios de docentes.
  4. **Módulos / Subtemas / Clases / Recursos:** Tablas completas y estilizadas para la gestión y asignación de contenidos.

### 2. Panel del Profesor (`/dashboard/profesor`)
* **Ubicación:** `src/pages/TeacherPanel.jsx` (Estilos en `TeacherPanel.css`).
* **Estructura:** Dividido en 7 pestañas para facilitar su labor de docencia:
  1. **Resumen:** Datos de perfil, estadísticas y próximas clases en calendario.
  2. **Mis Módulos:** Detalle de las temáticas asignadas.
  3. **Mis Clases:** Agenda de clases en vivo (Meet) y clases grabadas.
  4. **Presentaciones / Grabaciones / Recursos:** Listados con botones de acción rápida e interfaz simulada de arrastrar y soltar (Drag and Drop) para subir material.
  5. **Anuncios:** Historial de notificaciones emitidas por el profesor hacia sus alumnos.

### 3. Estudiante (`/dashboard`, `/modules`, `/teachers`)
* Vistas enfocadas al consumo del diplomado: ver temario, consultar clases, descargar presentaciones y revisar grabaciones.

---

## 🗂️ Modelo de Datos (Diseño)
El diseño lógico de las tablas (PK, FK y tipos) se encuentra documentado detalladamente en [DATA_MODEL.md](file:///d:/Universidad/LIATER/DATA_MODEL.md). Sirve como base para la futura migración e integración con una base de datos real (SQL/NoSQL).

---

## 🚀 Cómo Iniciar la Plataforma para Pruebas
1. Asegúrate de tener las dependencias al día:
   ```bash
   npm install
   ```
2. Corre el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
3. Abre el navegador en la URL indicada (usualmente `http://localhost:5173` o `http://localhost:5174`).
4. Prueba ingresando con las distintas credenciales del rol que quieras testear y usa el botón **"Cerrar Sesión"** en el Header para cambiar de cuenta.
