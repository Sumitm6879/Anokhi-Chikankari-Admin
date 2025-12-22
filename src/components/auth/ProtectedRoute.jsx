import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useAuth();

  // If no user is logged in, send them to the login page
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}