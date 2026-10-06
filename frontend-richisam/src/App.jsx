import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Pages & Layouts
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';

const App = () => {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EF]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[var(--color-richisam-orange)]"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      }} />
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
        />
        
        {/* Protected Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
              <p className="text-gray-500">Selamat datang di RichiStock, halaman utama sedang dalam tahap pengembangan.</p>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
