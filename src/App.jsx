/**
 * Archivo principal de rutas de la aplicación.
 * Define la estructura de navegación utilizando React Router.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// --- Importación de Componentes de Layout ---
import Layout from './components/Layout';

// --- Importación de Páginas ---
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UpdatePassword from './pages/UpdatePassword';
import ModulesList from './pages/ModulesList';
import ModuleDetail from './pages/ModuleDetail';
import ClassDetail from './pages/ClassDetail';
import Teachers from './pages/Teachers';
import TeacherResources from './pages/TeacherResources';
import ClassesManagement from './pages/ClassesManagement';
import UserManagement from './pages/UserManagement';
import AdminSettings from './pages/AdminSettings';
import AdminPanel from './pages/AdminPanel';
import TeacherPanel from './pages/TeacherPanel';
import Portal from './pages/Portal';
import Profile from './pages/Profile';
import Support from './pages/Support';

// --- Importación de Estilos Globales ---
import './App.css';

// --- Contextos ---
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    // Router principal que envuelve toda la aplicación para manejar el historial de navegación
    <AuthProvider>
      <Router>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          {/* Páginas accesibles sin necesidad de iniciar sesión */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          
          {/* --- RUTAS PRIVADAS (PLATAFORMA) --- */}
          {/* Envueltas en el componente <Layout />, el cual contiene el menú lateral y la barra superior.
              Todas estas rutas se renderizarán dentro del espacio de contenido del Layout. */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Rutas compartidas o específicas */}
            <Route path="/portal" element={<Portal />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/soporte" element={<Support />} />
            
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/profesor" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPanel /></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
            
            <Route path="/modules" element={<ModulesList />} />
            <Route path="/modules/:id" element={<ModuleDetail />} />
            <Route path="/class/:id" element={<ClassDetail />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/resources" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherResources /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ClassesManagement /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
