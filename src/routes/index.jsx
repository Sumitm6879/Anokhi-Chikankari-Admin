import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AddProduct from '../pages/AddProduct';
import Layout from '../components/layout/Layout';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-product" element={<AddProduct />}/>
          <Route path="/products" element={<div>Product List Coming Soon</div>} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}