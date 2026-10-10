import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import {
  Boxes, LayoutDashboard, ArrowLeftRight, PackagePlus, PackageX, Users, Store,
  Package, Gauge, ClipboardList, FileBarChart, Bell, LogOut, Menu, X, ChevronRight, ClipboardCheck, Wrench, Send, LineChart, CalendarClock
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import axiosClient from '../api/axiosClient';

/* Menu per role (RBAC) - Seluruh menu tetap dipertahankan 100% */
const MENUS = {
  STAF_CABANG: [
    { section: 'Utama', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Operasional',
      items: [
        { to: '/mutasi', label: 'Mutasi Stok', icon: ArrowLeftRight },
        { to: '/transfer', label: 'Transfer Cabang', icon: Send },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/assets', label: 'Inventaris Peralatan', icon: Wrench },
        { to: '/permintaan', label: 'Permintaan Barang', icon: PackagePlus },
        { to: '/opname', label: 'Stok Opname', icon: ClipboardCheck },
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
        { to: '/opening-balance', label: 'Stok Awal', icon: Boxes },
        { to: '/par-stock', label: 'Par Stock', icon: Gauge },
      ],
    },
    {
      section: 'Operasional',
      items: [
        { to: '/permintaan', label: 'Tiket Permintaan', icon: ClipboardList },
        { to: '/transfer', label: 'Transfer Cabang', icon: Send },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/assets', label: 'Inventaris Peralatan', icon: Wrench },
        { to: '/opname', label: 'Stok Opname', icon: ClipboardCheck },
        { to: '/defect', label: 'Defect & Retur', icon: PackageX },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
      ],
    },
  ],
  OWNER: [
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
        { to: '/mutasi', label: 'Mutasi Stok', icon: ArrowLeftRight },
        { to: '/transfer', label: 'Transfer Cabang', icon: Send },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/assets', label: 'Inventaris Peralatan', icon: Wrench },
        { to: '/opname', label: 'Stok Opname', icon: ClipboardCheck },
        { to: '/defect', label: 'Defect & Retur', icon: PackageX },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
      ],
    },
  ],
  ADMIN_GUDANG: [
    { section: 'Utama', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      section: 'Operasional',
      items: [
        { to: '/permintaan', label: 'Tiket Permintaan', icon: ClipboardList },
        { to: '/mutasi', label: 'Mutasi Stok', icon: ArrowLeftRight },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/opname', label: 'Stok Opname', icon: ClipboardCheck },
        { to: '/defect', label: 'Defect & Retur', icon: PackageX },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
      ],
    },
  ],
};

const ROLE_LABEL = {
  ADMIN_PUSAT: 'Admin Pusat',
  STAF_CABANG: 'Staf Cabang',
  ADMIN_GUDANG: 'Admin Gudang',
  OWNER: 'Owner',
};

const SidebarContent = ({ menus, user, onLogout, onNavigate }) => (
  <div className="flex flex-col h-full bg-[#16110F] text-white">
    {/* Brand Header */}
    <div className="h-20 flex items-center gap-3 px-6 shrink-0 border-b border-[#241C18]">
      <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl p-1.5 border border-white/10 shadow-sm">
        <img src="/logo.png" alt="Logo Richisam" className="w-full h-full object-contain" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-wider uppercase text-white">
            RICHI<span className="text-[#FFCE00]">STOCK</span>
          </span>
        </div>
        <p className="text-[10px] text-stone-400 font-medium tracking-tight -mt-0.5">Inventory Management</p>
      </div>
    </div>

    {/* Navigation Links - Pill Shaped Model seperti referensi */}
    <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
      {menus.map((group) => (
        <div key={group.section}>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            {group.section}
          </p>
          <ul className="space-y-1">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  id={`nav-${to === '/' ? 'dashboard' : to.slice(1)}`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#F9610D] text-white shadow-lg shadow-[#F9610D]/25 font-bold'
                        : 'text-stone-400 hover:text-white hover:bg-white/[0.05]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        className={isActive ? 'text-white' : 'text-stone-400 group-hover:text-[#F9610D] transition-colors'}
                      />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>

    {/* User Profile Card di bagian bawah Sidebar */}
    <div className="p-4 shrink-0 border-t border-[#241C18]">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1C1714] border border-[#2D241E]">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#FFCE00] to-[#F9610D] flex items-center justify-center text-[#1C1714] text-sm font-extrabold shadow-sm">
          {(user?.nama || user?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-white truncate">{user?.nama || user?.username || 'Pengguna'}</p>
          <p className="text-[11px] text-stone-400 truncate font-medium">{ROLE_LABEL[user?.role] || user?.role}</p>
        </div>
        <button
          id="btn-logout"
          onClick={onLogout}
          title="Keluar"
          aria-label="Keluar"
          className="p-2 rounded-xl text-stone-400 hover:text-[#EC1F27] hover:bg-white/[0.06] transition-colors cursor-pointer"
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
      } catch {
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
    <div className="h-screen flex bg-[#120E0C] text-white overflow-hidden font-sans">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#241C18]">
        <SidebarContent menus={menus} user={user} onLogout={logout} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#16110F] shadow-2xl transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
        <SidebarContent menus={menus} user={user} onLogout={logout} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#120E0C]">
        {/* Top Header */}
        <header className="h-18 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 bg-[#16110F]/90 backdrop-blur-md border-b border-[#241C18]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="btn-open-menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-stone-300 hover:bg-white/10"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                <span>RichiStock</span>
                <ChevronRight size={12} className="text-stone-600" />
                <span className="text-stone-300">{current?.label}</span>
              </div>
              <h1 className="text-base sm:text-xl font-extrabold text-white truncate leading-tight tracking-tight">
                {current?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden md:inline text-xs text-stone-400 font-medium">{today}</span>
            <span className="hidden md:block w-px h-5 bg-[#2D241E]" />

            {/* Notification Button */}
            <div className="relative" ref={notifRef}>
              <button
                id="btn-notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  notifOpen
                    ? 'bg-[#1C1714] border-[#F9610D] text-white shadow-sm'
                    : 'bg-[#181310] border-[#2D241E] text-stone-400 hover:text-white hover:border-stone-600'
                }`}
                aria-label="Notifikasi"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#EC1F27] ring-2 ring-[#181310]" />
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#382E28] bg-[#1A1412] shadow-2xl overflow-hidden z-50 animate-fade-in origin-top-right text-white">
                  <div className="border-b border-[#2D241E] px-4 py-3 flex items-center justify-between bg-[#15100E]">
                    <h3 className="font-bold text-white text-sm">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-[#F9610D]/20 text-[#F9610D] px-2 py-0.5 rounded-full border border-[#F9610D]/30">
                        {unreadCount} Baru
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <ul className="divide-y divide-[#241C18]">
                        {notifications.map((n) => (
                          <li
                            key={n.id}
                            className={`p-4 hover:bg-white/[0.03] transition-colors ${
                              !n.is_read ? 'bg-[#F9610D]/5' : ''
                            }`}
                          >
                            <p className={`text-sm ${!n.is_read ? 'font-semibold text-white' : 'text-stone-300'}`}>
                              {n.pesan}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">{new Date(n.created_at).toLocaleString('id-ID')}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="mx-auto h-6 w-6 text-stone-600 mb-2" />
                        <p className="text-xs text-stone-400">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[#2D241E] p-2.5 text-center bg-[#15100E]">
                    <button className="text-xs font-semibold text-[#F9610D] hover:underline cursor-pointer">
                      Tandai semua dibaca
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto bg-[#120E0C]">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
