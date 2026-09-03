import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

// Komponen Dashboard dummy sederhana
function Dashboard() {
  return (
    <div style={dashboardStyles.wrapper}>
      <div style={dashboardStyles.card}>
        <h1 style={dashboardStyles.title}>Dashboard Richisam</h1>
        <p style={dashboardStyles.subtitle}>
          Selamat datang di Sistem Manajemen Inventaris Richisam.
        </p>
      </div>
    </div>
  );
}

const dashboardStyles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(99,102,241,0.2)',
  },
  title: {
    margin: '0 0 12px',
    fontSize: '32px',
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    margin: 0,
    fontSize: '16px',
    color: '#94a3b8',
  },
};

// Konfigurasi routing utama aplikasi
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Fallback: semua rute tak dikenal diarahkan ke /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
