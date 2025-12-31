import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AddProduct from '../pages/AddProduct';
import Layout from '../components/layout/Layout';
import Products from '../pages/Products';
import EditProduct from '../pages/EditProduct';
import Attributes from '../pages/Attributes';
import SalesManager from '../pages/SalesManager';
import CreateOrder from '../pages/CreateOrder';
import Orders from '../pages/Orders';
import Settings from '../pages/Settings';
import TrendingManager from '../pages/TrendingManager';
import ActivityLogs from '../pages/ActivityLogs';

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
          <Route path="/products" element={<Products />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/attributes" element={<Attributes />} />
          <Route path="/sales" element={<SalesManager />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/trending" element={<TrendingManager />} />
          <Route path="/logs" element={<ActivityLogs />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}