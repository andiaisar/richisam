// src/components/DashboardLayout.jsx
import { useState } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import {
  HiHome, HiArchiveBox, HiClipboardDocumentList, HiArrowsRightLeft,
  HiBuildingStorefront, HiWrenchScrewdriver, HiBars3, HiXMark,
} from 'react-icons/hi2';

const menuItems = [
  { path: '/dashboard',        label: 'Beranda',          icon: HiHome },
  { path: '/dashboard/cabang', label: 'Dashboard Cabang', icon: HiBuildingStorefront },
  { path: '/dashboard/gudang', label: 'Dashboard Gudang', icon: HiWrenchScrewdriver },
  { path: '/inventaris',       label: 'Inventaris',       icon: HiArchiveBox },
  { path: '/permintaan',       label: 'Permintaan Stok',  icon: HiClipboardDocumentList },
  { path: '/mutasi',           label: 'Mutasi Stok',      icon: HiArrowsRightLeft },
];

function SidebarContent({ onClose }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{
        padding: '20px 18px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'var(--color-richisam-orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>R</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px', lineHeight: 1 }}>Richisam</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '2px' }}>Inventaris</div>
          </div>
        </div>
        {/* Tombol tutup — hanya muncul di mobile */}
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', padding: '4px',
          }}>
            <HiXMark style={{ width: '20px', height: '20px' }} />
          </button>
        )}
      </div>

      {/* Label grup */}
      <div style={{ padding: '16px 16px 4px' }}>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Menu Utama
        </span>
      </div>

      {/* Navigasi */}
      <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {menuItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path} end={path === '/dashboard'}
              style={{ textDecoration: 'none' }}
              onClick={onClose ?? undefined}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px',
                fontSize: '13px', fontWeight: isActive ? '600' : '400',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isActive ? 'rgba(249,97,13,0.18)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-richisam-orange)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
                <Icon style={{ width: '16px', height: '16px', flexShrink: 0, opacity: isActive ? 1 : 0.55 }} />
                {label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '9px 10px', borderRadius: '8px', border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.38)',
          fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'all 0.15s', fontFamily: 'var(--sans)',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(237,3,3,0.12)'; e.currentTarget.style.color = '#FF8080'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; }}
        >
          <span style={{ fontSize: '14px' }}>↩</span> Logout
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: 'var(--sans)', background: '#F5F2EF' }}>

      {/* ── Overlay mobile (klik di luar sidebar untuk tutup) ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30,
            background: 'rgba(0,0,0,0.45)',
          }}
        />
      )}

      {/* ── Sidebar Desktop (selalu tampil ≥ md) ── */}
      <aside style={{
        width: '220px',
        minHeight: '100vh',
        background: '#1A0F08',
        flexShrink: 0,
        display: 'none',    /* disembunyikan di mobile, tampil di desktop via media query */
      }} className="hidden md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* ── Sidebar Mobile (slide-in dari kiri) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '220px',
        background: '#1A0F08',
        zIndex: 40,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
      }} className="md:hidden">
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Konten Utama ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>

        {/* Header */}
        <header style={{
          height: '52px',
          background: '#fff',
          borderBottom: '1px solid #EDE8E4',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px 0 16px',
          gap: '10px',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          {/* Tombol hamburger — hanya muncul di mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#2D1810', padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <HiBars3 style={{ width: '22px', height: '22px' }} />
          </button>

          {/* Logo mobile inline */}
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '6px',
              background: 'var(--color-richisam-orange)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#fff' }}>R</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A0F08' }}>Richisam</span>
          </div>

          {/* Judul — hanya di desktop */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--color-richisam-orange)', opacity: 0.8 }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#2D1810', letterSpacing: '-0.1px' }}>
              Sistem Inventaris Terpusat — Richisam
            </span>
          </div>

          {/* Avatar */}
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(249,97,13,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: 'var(--color-richisam-orange)',
            }}>U</div>
          </div>
        </header>

        {/* Konten Halaman */}
        <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }} className="md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
