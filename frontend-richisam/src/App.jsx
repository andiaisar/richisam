import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Core Layout & Auth
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy-loaded Pages for optimal bundle splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Mutasi = lazy(() => import('./pages/Mutasi'));
const Transfer = lazy(() => import('./pages/Transfer'));
const Permintaan = lazy(() => import('./pages/Permintaan'));
const Defect = lazy(() => import('./pages/Defect'));
const Users = lazy(() => import('./pages/Users'));
const Outlets = lazy(() => import('./pages/Outlets'));
const Products = lazy(() => import('./pages/Products'));
const OpeningBalance = lazy(() => import('./pages/OpeningBalance'));
const Assets = lazy(() => import('./pages/Assets'));
const Opname = lazy(() => import('./pages/Opname'));
const ParStock = lazy(() => import('./pages/ParStock'));
const Laporan = lazy(() => import('./pages/Laporan'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Kadaluarsa = lazy(() => import('./pages/Kadaluarsa'));
const ShiftClosing = lazy(() => import('./pages/ShiftClosing'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-stone-700 border-t-[#F9610D]"></div>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
          />
          
          {/* Protected Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="mutasi" element={<Mutasi />} />
            <Route path="transfer" element={<Transfer />} />
            <Route path="permintaan" element={<Permintaan />} />
            <Route path="defect" element={<Defect />} />
            <Route path="users" element={<Users />} />
            <Route path="outlets" element={<Outlets />} />
            <Route path="products" element={<Products />} />
            <Route path="opening-balance" element={<OpeningBalance />} />
            <Route path="assets" element={<Assets />} />
            <Route path="opname" element={<Opname />} />
            <Route path="par-stock" element={<ParStock />} />
            <Route path="laporan" element={<Laporan />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="kadaluarsa" element={<Kadaluarsa />} />
            <Route path="shift-closing" element={<ShiftClosing />} />
            <Route path="audit-trail" element={<AuditTrail />} />
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Routes>
      </Suspense>
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
