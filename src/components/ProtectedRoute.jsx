import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirigir según el rol del usuario si no tiene permiso
    if (currentUser.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (currentUser.role === 'teacher') return <Navigate to="/dashboard/profesor" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
