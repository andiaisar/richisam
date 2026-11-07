import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Core Layout & Auth
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';

// Helper agar jika terjadi redeploy di Vercel (nama file chunk berubah), halaman otomatis reload tanpa error
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageAlreadyRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_retry_refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('chunk_retry_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageAlreadyRefreshed) {
        window.sessionStorage.setItem('chunk_retry_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy-loaded Pages for optimal bundle splitting
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Mutasi = lazyWithRetry(() => import('./pages/Mutasi'));
const Transfer = lazyWithRetry(() => import('./pages/Transfer'));
const Permintaan = lazyWithRetry(() => import('./pages/Permintaan'));
const Defect = lazyWithRetry(() => import('./pages/Defect'));
const Users = lazyWithRetry(() => import('./pages/Users'));
const Outlets = lazyWithRetry(() => import('./pages/Outlets'));
const Products = lazyWithRetry(() => import('./pages/Products'));
const OpeningBalance = lazyWithRetry(() => import('./pages/OpeningBalance'));
const Assets = lazyWithRetry(() => import('./pages/Assets'));
const Opname = lazyWithRetry(() => import('./pages/Opname'));
const ParStock = lazyWithRetry(() => import('./pages/ParStock'));
const Laporan = lazyWithRetry(() => import('./pages/Laporan'));
const Analytics = lazyWithRetry(() => import('./pages/Analytics'));
const Kadaluarsa = lazyWithRetry(() => import('./pages/Kadaluarsa'));
const ShiftClosing = lazyWithRetry(() => import('./pages/ShiftClosing'));
const AuditTrail = lazyWithRetry(() => import('./pages/AuditTrail'));

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
