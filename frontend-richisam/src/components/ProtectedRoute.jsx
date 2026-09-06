// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('token');

  // Jika token ada, render komponen anak (halaman dashboard). Jika tidak, arahkan ke login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
