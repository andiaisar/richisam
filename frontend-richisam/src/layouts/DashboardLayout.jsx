import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import {
  Boxes, LayoutDashboard, ArrowLeftRight, PackagePlus, PackageX, Users, Store,
  Package, Gauge, ClipboardList, FileBarChart, Bell, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import axiosClient from '../api/axiosClient';

/* Menu per role (RBAC) */
const MENUS = {
  STAF_CABANG: [
    { section: 'Utama', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Operasional',
      items: [
        { to: '/mutasi', label: 'Mutasi Stok', icon: ArrowLeftRight },
        { to: '/permintaan', label: 'Permintaan Barang', icon: PackagePlus },
        { to: '/defect', label: 'Laporan Defect', icon: PackageX },
      ],
    },
  ],
  ADMIN_PUSAT: [
    { section: 'Utama', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Master Data',
      items: [
        { to: '/users', label: 'Manajemen User', icon: Users },
        { to: '/outlets', label: 'Cabang', icon: Store },
        { to: '/products', label: 'Produk', icon: Package },
        { to: '/par-stock', label: 'Par Stock', icon: Gauge },
      ],
    },
    {
      section: 'Operasional',
      items: [
        { to: '/permintaan', label: 'Tiket Permintaan', icon: ClipboardList },
        { to: '/defect', label: 'Defect & Retur', icon: PackageX },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
      ],
    },
  ],
};

const ROLE_LABEL = { ADMIN_PUSAT: 'Admin Pusat', STAF_CABANG: 'Staf Cabang' };

const SidebarContent = ({ menus, user, onLogout, onNavigate }) => (
  <div className="flex flex-col h-full">
    {/* Brand */}
    <div className="h-16 flex items-center gap-3 px-5 shrink-0">
      <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg p-1">
        <img src="/logo.png" alt="Logo Richisam" className="w-full h-full object-contain" />
      </div>
      <span className="text-[17px] font-bold tracking-tight text-white">RichiStock</span>
    </div>

    {/* Nav */}
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {menus.map((group) => (
        <div key={group.section}>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
            {group.section}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  id={`nav-${to === '/' ? 'dashboard' : to.slice(1)}`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.07] text-white'
                        : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-richisam-orange" />
                      )}
                      <Icon
                        size={18}
                        className={isActive ? 'text-richisam-orange' : 'text-white/40 group-hover:text-white/70'}
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>

    {/* User card */}
    <div className="p-3 shrink-0">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-richisam-kuning to-richisam-orange flex items-center justify-center text-ink text-sm font-bold">
          {(user?.nama || user?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{user?.nama || user?.username || 'Pengguna'}</p>
          <p className="text-xs text-white/45 truncate">{ROLE_LABEL[user?.role] || user?.role}</p>
        </div>
        <button
          id="btn-logout"
          onClick={onLogout}
          title="Keluar"
          aria-label="Keluar"
          className="p-2 rounded-lg text-white/45 hover:text-richisam-merah-muda hover:bg-white/[0.06] transition-colors"
        >
          <LogOut size={17} />
        </button>
      </div>
    </div>
  </div>
);

const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          axiosClient.get('/notifications/unread-count'),
          axiosClient.get('/notifications?limit=5')
        ]);
        setUnreadCount(countRes.data?.count || 0);
        setNotifications(listRes.data?.data || []);
      } catch (e) {
        console.error('Failed to fetch notifications');
      }
    };
    if (isAuthenticated) fetchNotifs();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const menus = MENUS[user?.role] || MENUS.STAF_CABANG;
  const allItems = menus.flatMap((g) => g.items);
  const current =
    allItems.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/')) ||
    allItems[0];

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="h-screen flex bg-cream overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block w-64 shrink-0 bg-ink">
        <SidebarContent menus={menus} user={user} onLogout={logout} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-ink shadow-2xl transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
        <SidebarContent menus={menus} user={user} onLogout={logout} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 bg-cream/80 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="btn-open-menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-ink hover:bg-sand"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
                <span>RichiStock</span>
                <ChevronRight size={12} />
                <span className="text-ink/70">{current?.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-ink truncate leading-tight">{current?.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline text-sm text-muted">{today}</span>
            <span className="hidden md:block w-px h-6 bg-line" />
            <div className="relative" ref={notifRef}>
              <button
                id="btn-notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${notifOpen ? 'bg-cream border-ink/20 text-ink' : 'bg-white border-line text-ink/70 hover:text-ink hover:border-ink/15 hover:shadow-sm'}`}
                aria-label="Notifikasi"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-richisam-merah-muda ring-2 ring-white" />
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-line bg-white shadow-lg overflow-hidden z-50 animate-fade-in origin-top-right">
                  <div className="border-b border-line px-4 py-3 flex items-center justify-between bg-cream/30">
                    <h3 className="font-semibold text-ink text-sm">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-richisam-orange/10 text-richisam-orange px-2 py-0.5 rounded-full">
                        {unreadCount} Baru
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {notifications.map(n => (
                          <li key={n.id} className={`p-4 hover:bg-cream/50 transition-colors ${!n.is_read ? 'bg-cream/20' : ''}`}>
                            <p className={`text-sm ${!n.is_read ? 'font-semibold text-ink' : 'text-ink/80'}`}>{n.pesan}</p>
                            <p className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleString('id-ID')}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="mx-auto h-6 w-6 text-muted/50 mb-2" />
                        <p className="text-sm text-muted">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-line p-2 text-center bg-cream/30">
                    <button className="text-xs font-medium text-richisam-orange hover:text-richisam-merah-muda">
                      Tandai semua dibaca
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
