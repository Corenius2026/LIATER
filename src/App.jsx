/**
 * Archivo principal de rutas de la aplicación.
 * Define la estructura de navegación utilizando React Router con Code-Splitting optimizado.
 */
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- Importación de Componentes de Layout ---
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// --- Importación de Páginas con React.lazy para Code-Splitting ---
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const UpdatePassword = React.lazy(() => import('./pages/UpdatePassword'));
const ModulesList = React.lazy(() => import('./pages/ModulesList'));
const ModuleDetail = React.lazy(() => import('./pages/ModuleDetail'));
const ClassDetail = React.lazy(() => import('./pages/ClassDetail'));
const Teachers = React.lazy(() => import('./pages/Teachers'));
const TeacherResources = React.lazy(() => import('./pages/TeacherResources'));
const ClassesManagement = React.lazy(() => import('./pages/ClassesManagement'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Communications = React.lazy(() => import('./pages/Communications'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const TeacherPanel = React.lazy(() => import('./pages/TeacherPanel'));
const Portal = React.lazy(() => import('./pages/Portal'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Support = React.lazy(() => import('./pages/Support'));
const CourseViewerMock = React.lazy(() => import('./pages/CourseViewerMock'));
const SyllabusRedirector = React.lazy(() => import('./pages/SyllabusRedirector'));
const UpcomingPrograms = React.lazy(() => import('./pages/UpcomingPrograms'));
const PendingActivities = React.lazy(() => import('./pages/PendingActivities'));
const MisResultados = React.lazy(() => import('./pages/MisResultados'));

// --- Importación de Estilos Globales ---
import './App.css';

function PageFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.85rem',
      padding: '2rem'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(11, 21, 40, 0.1)',
        borderTopColor: 'var(--gold-dark, #cca352)',
        borderRadius: '50%',
        animation: 'liaterSpin 0.75s linear infinite'
      }} />
      <style>{`@keyframes liaterSpin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', letterSpacing: '0.3px' }}>
        Cargando sección...
      </span>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* --- RUTAS PÚBLICAS --- */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* --- RUTAS PRIVADAS (PLATAFORMA) --- */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/portal" element={<Portal />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/soporte" element={<Support />} />
              <Route path="/proximos-programas" element={<UpcomingPrograms />} />
              <Route path="/pendientes" element={<PendingActivities />} />
              <Route path="/resultados/:programId" element={<MisResultados />} />
              <Route path="/mock-course" element={<CourseViewerMock />} />
              
              <Route path="/dashboard/:programId" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/profesor/:programId" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPanel /></ProtectedRoute>} />
              <Route path="/dashboard/admin/:programId" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
              
              <Route path="/modules/:programId" element={<ModulesList />} />
              <Route path="/syllabus/:programId" element={<SyllabusRedirector />} />
              <Route path="/module/:id" element={<ModuleDetail />} />
              <Route path="/class/*" element={<ClassDetail />} />
              <Route path="/teachers/:programId" element={<Teachers />} />
              <Route path="/resources/:programId" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherResources /></ProtectedRoute>} />
              <Route path="/classes/:programId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ClassesManagement /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
              <Route path="/communications" element={<ProtectedRoute allowedRoles={['admin']}><Communications /></ProtectedRoute>} />
            </Route>
            
            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
