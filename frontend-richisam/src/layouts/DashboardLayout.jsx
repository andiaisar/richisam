import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes, LayoutDashboard, ArrowLeftRight, PackagePlus, PackageX, Users, Store,
  Package, Gauge, ClipboardList, FileBarChart, Bell, LogOut, Menu, X, ChevronRight, ClipboardCheck, Wrench, Send, LineChart, CalendarClock, Lock, ShieldAlert, Sun, Moon, CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
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
        { to: '/shift-closing', label: 'Tutup Shift', icon: Lock },
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
        { to: '/shift-closing', label: 'Tutup Shift', icon: Lock },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
        { to: '/audit-trail', label: 'Log Aktivitas (Audit)', icon: ShieldAlert },
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
        { to: '/shift-closing', label: 'Tutup Shift', icon: Lock },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
        { to: '/audit-trail', label: 'Log Aktivitas (Audit)', icon: ShieldAlert },
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
        { to: '/shift-closing', label: 'Tutup Shift', icon: Lock },
        { to: '/laporan', label: 'Laporan', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
        { to: '/audit-trail', label: 'Log Aktivitas (Audit)', icon: ShieldAlert },
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

const getNotifConfig = (tipe) => {
  switch (tipe) {
    case 'KADALUARSA':
      return {
        label: 'Kadaluarsa / FEFO',
        title: 'Peringatan Kadaluarsa & FEFO',
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dotBg: 'bg-rose-500',
        modalIconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        icon: CalendarClock,
        actionLabel: () => 'Cek Masa Kadaluwarsa',
        actionPath: () => '/kadaluarsa',
        actionIcon: CalendarClock,
        buttonBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
      };
    case 'PAR_STOCK':
      return {
        label: 'Par Stock',
        title: 'Peringatan Stok Kritis (Par Stock)',
        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dotBg: 'bg-amber-500',
        modalIconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: Gauge,
        actionLabel: (role) => (role === 'STAF_CABANG' ? 'Ajukan Permintaan Restock' : 'Cek Stok & Mutasi'),
        actionPath: (role) => (role === 'STAF_CABANG' ? '/permintaan' : '/mutasi'),
        actionIcon: ArrowLeftRight,
        buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25',
      };
    case 'TIKET':
      return {
        label: 'Tiket & Pengiriman',
        title: 'Tiket Permintaan & Surat Jalan',
        badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        dotBg: 'bg-sky-500',
        modalIconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        icon: Send,
        actionLabel: () => 'Buka Tiket Permintaan',
        actionPath: () => '/permintaan',
        actionIcon: PackagePlus,
        buttonBg: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25',
      };
    case 'DEFECT':
      return {
        label: 'Laporan Defect',
        title: 'Laporan Defect & Penyesuaian Stok',
        badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        dotBg: 'bg-purple-500',
        modalIconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        icon: PackageX,
        actionLabel: () => 'Tinjau Laporan Defect',
        actionPath: () => '/defect',
        actionIcon: PackageX,
        buttonBg: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25',
      };
    default:
      return {
        label: tipe || 'Sistem',
        title: 'Pemberitahuan Sistem',
        badgeBg: 'bg-[#F9610D]/15 text-[#F9610D] border-[#F9610D]/30',
        dotBg: 'bg-[#F9610D]',
        modalIconBg: 'bg-[#F9610D]/15 text-[#F9610D] border-[#F9610D]/30',
        icon: Bell,
        actionLabel: null,
        actionPath: null,
        actionIcon: ArrowLeftRight,
        buttonBg: 'bg-[#F9610D] hover:bg-[#d9530a] shadow-[#F9610D]/25',
      };
  }
};

const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifRef = useRef(null);
  const location = useLocation();

  const fetchNotifs = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        axiosClient.get('/notifications/unread-count'),
        axiosClient.get('/notifications?limit=10')
      ]);
      const count =
        countRes?.count ??
        countRes?.data?.count ??
        (typeof countRes?.data === 'number' ? countRes.data : 0);
      const list = Array.isArray(listRes?.data)
        ? listRes.data
        : Array.isArray(listRes?.data?.data)
          ? listRes.data.data
          : Array.isArray(listRes)
            ? listRes
            : [];
      setUnreadCount(Number(count) || 0);
      setNotifications(list);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);

  const handleNotificationClick = async (notif) => {
    setSelectedNotif(notif);
    setNotifOpen(false);
    if (!notif.is_read) {
      try {
        await axiosClient.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Semua notifikasi ditandai dibaca');
    } catch (err) {
      console.error('Failed to mark all as read', err);
      toast.error('Gagal menandai semua notifikasi');
    }
  };

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
        <header className="h-18 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 bg-[#16110F]/90 backdrop-blur-md border-b border-[#241C18] relative z-40">
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

            {/* Theme Toggle */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={toggleTheme}
              role="switch"
              aria-checked={isLight}
              aria-label={isLight ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
              title={isLight ? 'Mode Gelap' : 'Mode Terang'}
              className="relative h-10 w-[4.5rem] shrink-0 rounded-xl border border-[#2D241E] bg-[#181310] p-1 transition-colors cursor-pointer hover:border-[#F9610D]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9610D]/60"
            >
              <span
                className={`absolute top-1 left-1 h-8 w-8 rounded-lg bg-gradient-to-br from-[#FFCE00] to-[#F9610D] shadow-md transition-transform duration-300 ease-out ${
                  isLight ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
              <span className="relative z-10 flex h-full items-center justify-between px-[0.4rem]">
                <Moon size={16} className={`transition-colors ${isLight ? 'text-stone-400' : 'text-[#1C1714]'}`} />
                <Sun size={16} className={`transition-colors ${isLight ? 'text-[#1C1714]' : 'text-stone-500'}`} />
              </span>
            </button>

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
                  <span 
                    id="badge-notification-count"
                    className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#EC1F27] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse border-2 border-[#120E0C]"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div 
                  id="dropdown-notifications"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#382E28] bg-[#1A1412] shadow-2xl overflow-hidden z-[100] animate-fade-in origin-top-right text-white"
                >
                  <div className="border-b border-[#2D241E] px-4 py-3 flex items-center justify-between bg-[#15100E]">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">Notifikasi</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-[#F9610D]/20 text-[#F9610D] px-2 py-0.5 rounded-full border border-[#F9610D]/30">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        id="btn-mark-all-read-header"
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-[#F9610D] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck size={14} />
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <ul className="divide-y divide-[#241C18]">
                        {notifications.map((n) => {
                          const cfg = getNotifConfig(n.tipe);
                          const IconComp = cfg.icon;
                          return (
                            <li
                              key={n.id}
                              id={`notif-item-${n.id}`}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer flex items-start gap-3 ${
                                !n.is_read ? 'bg-white/[0.03]' : ''
                              }`}
                            >
                              <div className={`mt-0.5 p-2 rounded-xl shrink-0 border ${cfg.modalIconBg}`}>
                                <IconComp size={15} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs sm:text-sm line-clamp-2 ${!n.is_read ? 'font-semibold text-white' : 'text-stone-300'}`}>
                                  {n.pesan}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badgeBg}`}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-[11px] text-stone-500">
                                    {new Date(n.created_at).toLocaleString('id-ID', {
                                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                  </span>
                                  {!n.is_read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC1F27] ml-auto shrink-0" />
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="mx-auto h-7 w-7 text-stone-600 mb-2" />
                        <p className="text-xs text-stone-400">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="border-t border-[#2D241E] p-2.5 text-center bg-[#15100E]">
                      <button 
                        id="btn-mark-all-read-footer"
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-[#F9610D] hover:underline cursor-pointer flex items-center justify-center gap-1.5 w-full"
                      >
                        <CheckCheck size={14} />
                        Tandai semua telah dibaca
                      </button>
                    </div>
                  )}
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

      {/* Modal Detail Notifikasi (Berada di Paling Depan Layar / z-[9999]) */}
      {selectedNotif && (() => {
        const cfg = getNotifConfig(selectedNotif.tipe);
        const ModalIcon = cfg.icon;
        const ActionIcon = cfg.actionIcon;
        const actionPath = typeof cfg.actionPath === 'function' ? cfg.actionPath(user?.role) : cfg.actionPath;
        const actionLabel = typeof cfg.actionLabel === 'function' ? cfg.actionLabel(user?.role) : cfg.actionLabel;

        return (
          <div 
            id="modal-notification-detail"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedNotif(null)}
          >
            <div 
              className="relative w-full max-w-md rounded-3xl border border-[#382E28] bg-[#1A1412] p-6 shadow-2xl overflow-hidden text-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${cfg.modalIconBg}`}>
                    <ModalIcon size={24} />
                  </div>
                  <div>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.badgeBg}`}>
                      {cfg.title}
                    </span>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(selectedNotif.created_at).toLocaleString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button 
                  id="btn-close-notif-modal"
                  onClick={() => setSelectedNotif(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="my-5 p-4 rounded-2xl bg-[#140F0D] border border-[#2D241E]">
                <p className="text-sm sm:text-base font-medium text-stone-100 leading-relaxed">
                  {selectedNotif.pesan}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  id="btn-notif-modal-dismiss"
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-300 hover:text-white hover:bg-white/5 border border-stone-700/80 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                {actionPath && (
                  <button
                    id="btn-notif-modal-action"
                    onClick={() => {
                      setSelectedNotif(null);
                      navigate(actionPath);
                    }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-2 ${cfg.buttonBg}`}
                  >
                    <ActionIcon size={16} />
                    {actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DashboardLayout;
