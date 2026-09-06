import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import DashboardCabang from './pages/DashboardCabang';
import DashboardGudang from './pages/DashboardGudang';


// Komponen Beranda placeholder — akan diganti halaman nyata nanti
function Dashboard() {
  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '36px 40px',
        border: '1px solid #EDE8E4',
        boxShadow: '0 2px 12px rgba(26,15,8,0.06)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'var(--color-richisam-orange)',
          marginBottom: '18px',
          boxShadow: '0 4px 12px rgba(249,97,13,0.22)',
        }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>R</span>
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#1A0F08' }}>
          Selamat Datang di Richisam
        </h1>
        <p style={{ margin: 0, color: '#7A6F69', lineHeight: '1.65', fontSize: '14px' }}>
          Sistem Manajemen Inventaris &amp; Permintaan Stok Cabang.<br />
          Pilih menu di sidebar kiri untuk mulai bekerja.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
          {['🏪 Dashboard Cabang', '🏭 Dashboard Gudang'].map(label => (
            <div key={label} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
              background: 'rgba(249,97,13,0.07)', color: 'var(--color-richisam-orange)',
              fontWeight: '600', cursor: 'default',
            }}>{label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Konfigurasi routing utama aplikasi
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute yang dilindungi — harus login dulu */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/cabang" element={<DashboardCabang />} />
            <Route path="/dashboard/gudang" element={<DashboardGudang />} />
            {/* Tambahkan halaman lain di sini */}
          </Route>
        </Route>

        {/* Fallback: semua rute tak dikenal diarahkan ke /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
