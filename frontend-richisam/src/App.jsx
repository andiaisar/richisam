import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Pages & Layouts
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';

const App = () => {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-line border-t-richisam-orange"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{
        style: {
          borderRadius: '12px',
          background: '#1C1714',
          color: '#fff',
          fontSize: '14px',
        },
      }} />
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
        />
        
        {/* Protected Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
    </Router>
  );
};

const ComingSoon = () => (
  <div className="rounded-2xl bg-white border border-dashed border-line p-12 text-center">
    <p className="text-lg font-semibold text-ink">Halaman sedang dibangun</p>
    <p className="mt-1 text-sm text-muted">Fitur ini akan tersedia pada langkah berikutnya.</p>
  </div>
);

export default App;
