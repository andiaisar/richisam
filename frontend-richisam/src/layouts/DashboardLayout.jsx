import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes, LayoutDashboard, ArrowLeftRight, PackagePlus, PackageX, Users, Store,
  Package, Gauge, ClipboardList, FileBarChart, Bell, LogOut, Menu, X, ChevronRight, ClipboardCheck, Wrench, Send, LineChart, CalendarClock, Lock, ShieldAlert, Sun, Moon, CheckCheck, Volume2, VolumeX,
  Key, Eye, EyeOff, UserCheck, Shield
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
      section: 'Operasional Outlet',
      items: [
        { to: '/permintaan', label: 'Permintaan Barang', icon: PackagePlus },
        { to: '/mutasi', label: 'Mutasi Stok', icon: ArrowLeftRight },
        { to: '/transfer', label: 'Transfer Cabang', icon: Send },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/assets', label: 'Inventaris Peralatan', icon: Wrench },
        { to: '/opname', label: 'Stok Opname', icon: ClipboardCheck },
        { to: '/defect', label: 'Laporan Defect', icon: PackageX },
        { to: '/shift-closing', label: 'Tutup Shift', icon: Lock },
        { to: '/analytics', label: 'Analitik & Prediksi', icon: LineChart },
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
      section: 'Operasional Central Kitchen',
      items: [
        { to: '/permintaan', label: 'Tiket Permintaan Cabang', icon: ClipboardList },
        { to: '/mutasi', label: 'Mutasi Stok CK', icon: ArrowLeftRight },
        { to: '/kadaluarsa', label: 'Masa Kadaluarsa', icon: CalendarClock },
        { to: '/assets', label: 'Inventaris Peralatan', icon: Wrench },
        { to: '/opname', label: 'Stok Opname CK', icon: ClipboardCheck },
        { to: '/defect', label: 'Defect & Retur', icon: PackageX },
        { to: '/shift-closing', label: 'Tutup Shift CK', icon: Lock },
        { to: '/laporan', label: 'Laporan Stok CK', icon: FileBarChart },
        { to: '/analytics', label: 'Analitik & Prediksi CK', icon: LineChart },
      ],
    },
  ],
};

const getRoleDisplayName = (user) => {
  if (!user) return '';
  if (user.role === 'ADMIN_PUSAT') return 'Admin Pusat';
  if (user.role === 'OWNER') return 'Owner';
  if (user.role === 'ADMIN_GUDANG') return 'Staf Central Kitchen (CK)';
  if (user.role === 'STAF_CABANG') {
    if (user.outlet_id === 1 || user.outlet_name?.toLowerCase().includes('central kitchen') || user.outlet_name?.toLowerCase().includes('ck')) {
      return 'Staf Central Kitchen (CK)';
    }
    return 'Staf Outlet';
  }
  return user.role || 'Pengguna';
};

const ROLE_LABEL = {
  ADMIN_PUSAT: 'Admin Pusat',
  STAF_CABANG: 'Staf Outlet',
  ADMIN_GUDANG: 'Staf Central Kitchen (CK)',
  OWNER: 'Owner',
};

const SidebarContent = ({ menus, user, onLogout, onNavigate, onOpenProfile }) => (
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
          <p className="text-[11px] text-stone-400 truncate font-medium">{getRoleDisplayName(user)}</p>
        </div>
        <button
          id="btn-edit-profile"
          onClick={onOpenProfile}
          title="Ubah Profil & Password"
          aria-label="Ubah Profil & Password"
          className="p-2 rounded-xl text-stone-400 hover:text-[#FFCE00] hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <Key size={17} />
        </button>
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

const playNotificationSound = () => {
  try {
    const isMuted = localStorage.getItem('richistock_notif_muted') === 'true';
    if (isMuted) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Elegant two-tone bell chime (D5 -> A5)
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.35); // D5
    playTone(880.00, now + 0.12, 0.45); // A5
  } catch {
    // Autoplay restriction before user gesture
  }
};

const DashboardLayout = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState('ALL');
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('richistock_notif_muted') === 'true');
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const location = useLocation();

  // State untuk Modal Pengaturan Akun & Password Pribadi
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nama: '',
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const handleOpenProfile = () => {
    setProfileForm({
      nama: user?.nama || '',
      old_password: '',
      new_password: '',
      confirm_password: '',
    });
    setShowPassword(false);
    setProfileModalOpen(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.nama.trim()) {
      return toast.error('Nama lengkap tidak boleh kosong');
    }
    if (profileForm.new_password) {
      if (profileForm.new_password.length < 6) {
        return toast.error('Password baru minimal 6 karakter');
      }
      if (!profileForm.old_password) {
        return toast.error('Password lama wajib diisi');
      }
      if (profileForm.new_password !== profileForm.confirm_password) {
        return toast.error('Konfirmasi password baru tidak cocok');
      }
    }

    setProfileSubmitting(true);
    try {
      const payload = {
        nama: profileForm.nama.trim(),
      };
      if (profileForm.new_password) {
        payload.old_password = profileForm.old_password;
        payload.new_password = profileForm.new_password;
      }
      const res = await axiosClient.put('/auth/profile', payload);
      updateUser({ nama: profileForm.nama.trim() });
      toast.success(res?.data?.message || 'Profil berhasil diperbarui');
      setProfileModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem('richistock_notif_muted', String(next));
    if (!next) {
      playNotificationSound();
      toast.success('Suara notifikasi aktif');
    } else {
      toast('Suara notifikasi dibisukan');
    }
  };

  const fetchNotifs = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        axiosClient.get('/notifications/unread-count'),
        axiosClient.get('/notifications?limit=15')
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
      
      const numCount = Number(count) || 0;
      if (prevUnreadRef.current !== null && numCount > prevUnreadRef.current) {
        playNotificationSound();
      }
      prevUnreadRef.current = numCount;

      setUnreadCount(numCount);
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

  const isCK = user?.role === 'ADMIN_GUDANG' || (user?.role === 'STAF_CABANG' && (user?.outlet_id === 1 || user?.outlet_name?.toLowerCase().includes('central kitchen') || user?.outlet_name?.toLowerCase().includes('ck')));
  const menus = user?.role === 'OWNER' 
    ? MENUS.OWNER 
    : user?.role === 'ADMIN_PUSAT' 
    ? MENUS.ADMIN_PUSAT 
    : isCK 
    ? MENUS.ADMIN_GUDANG 
    : MENUS.STAF_CABANG;
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
        <SidebarContent menus={menus} user={user} onLogout={logout} onOpenProfile={handleOpenProfile} />
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
        <SidebarContent menus={menus} user={user} onLogout={logout} onNavigate={() => setMobileOpen(false)} onOpenProfile={handleOpenProfile} />
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSound}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          soundMuted 
                            ? 'text-stone-500 border-stone-800 hover:text-stone-300' 
                            : 'text-[#F9610D] border-[#F9610D]/30 bg-[#F9610D]/10'
                        }`}
                        title={soundMuted ? 'Aktifkan audio chime notifikasi' : 'Bisukan suara notifikasi'}
                        aria-label="Toggle Sound"
                      >
                        {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
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
                  </div>

                  {/* Filter Chips Bar */}
                  <div className="px-3 py-2 bg-[#120E0C] border-b border-[#2D241E] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setNotifCategoryFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                        notifCategoryFilter === 'ALL'
                          ? 'bg-white/15 text-white border border-white/30'
                          : 'text-stone-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Semua ({notifications.length})
                    </button>
                    {notifications.some(n => n.tipe === 'KADALUARSA') && (
                      <button
                        onClick={() => setNotifCategoryFilter('KADALUARSA')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          notifCategoryFilter === 'KADALUARSA'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                      >
                        Kadaluarsa ({notifications.filter(n => n.tipe === 'KADALUARSA').length})
                      </button>
                    )}
                    {notifications.some(n => n.tipe === 'PAR_STOCK') && (
                      <button
                        onClick={() => setNotifCategoryFilter('PAR_STOCK')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          notifCategoryFilter === 'PAR_STOCK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        Par Stock ({notifications.filter(n => n.tipe === 'PAR_STOCK').length})
                      </button>
                    )}
                    {notifications.some(n => n.tipe === 'TIKET') && (
                      <button
                        onClick={() => setNotifCategoryFilter('TIKET')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          notifCategoryFilter === 'TIKET'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'text-sky-400/80 hover:text-sky-400 hover:bg-sky-500/10'
                        }`}
                      >
                        Tiket ({notifications.filter(n => n.tipe === 'TIKET').length})
                      </button>
                    )}
                    {notifications.some(n => n.tipe === 'DEFECT') && (
                      <button
                        onClick={() => setNotifCategoryFilter('DEFECT')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          notifCategoryFilter === 'DEFECT'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'text-purple-400/80 hover:text-purple-400 hover:bg-purple-500/10'
                        }`}
                      >
                        Defect ({notifications.filter(n => n.tipe === 'DEFECT').length})
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <ul className="divide-y divide-[#241C18]">
                        {notifications
                          .filter(n => notifCategoryFilter === 'ALL' || n.tipe === notifCategoryFilter)
                          .map((n) => {
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

              <div className="my-5 p-4 rounded-2xl bg-[#140F0D] border border-[#2D241E] [html[data-theme='light']_&]:bg-[#F9F5F0] [html[data-theme='light']_&]:border-[#E8DED3]">
                <p className="text-sm sm:text-base font-medium text-stone-100 [html[data-theme='light']_&]:text-[#140F0D] leading-relaxed">
                  {selectedNotif.pesan}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 flex-wrap">
                <button
                  id="btn-notif-modal-dismiss"
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-300 hover:text-white hover:bg-white/5 border border-stone-700/80 [html[data-theme='light']_&]:text-[#241B16] [html[data-theme='light']_&]:border-[#D4C5B5] [html[data-theme='light']_&]:hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                {selectedNotif.tipe === 'KADALUARSA' && (
                  <button
                    id="btn-notif-modal-afkir"
                    onClick={() => {
                      const notif = selectedNotif;
                      setSelectedNotif(null);
                      navigate('/defect', {
                        state: {
                          autoOpenDefect: true,
                          defectData: {
                            product_id: notif.product_id,
                            tipe: 'RUSAK',
                            keterangan: notif.pesan
                          }
                        }
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 [html[data-theme='light']_&]:bg-rose-100 [html[data-theme='light']_&]:text-rose-800 [html[data-theme='light']_&]:border-rose-300 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldAlert size={16} />
                    Afkir ke Defect
                  </button>
                )}
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

      {/* Modal Pengaturan Profil & Ganti Password Pribadi */}
      {profileModalOpen && (
        <div 
          id="modal-profile-settings"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => !profileSubmitting && setProfileModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-md rounded-3xl border border-[#382E28] bg-[#1A1412] p-6 shadow-2xl overflow-hidden text-white animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#2D241E]">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#FFCE00]/15 text-[#FFCE00] border border-[#FFCE00]/30">
                  <Key size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Profil & Ganti Password</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Kelola identitas dan keamanan akun login Anda</p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                disabled={profileSubmitting}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
              {/* Info Akun (Read-only) */}
              <div className="p-3.5 rounded-2xl bg-[#140F0D] border border-[#2D241E] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-medium">Username:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                      {user?.username}
                    </span>
                    <span className="text-[10px] text-stone-400 bg-stone-800/80 px-1.5 py-0.5 rounded border border-stone-700" title="Username dikunci untuk integritas audit trail">
                      Terkunci
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-medium">Peran / Role:</span>
                  <span className="font-bold text-[#F9610D]">{getRoleDisplayName(user)}</span>
                </div>
              </div>

              {/* Edit Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={profileForm.nama}
                  onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120E0C] border border-[#2D241E] text-white text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] transition-colors"
                />
              </div>

              {/* Bagian Ganti Password */}
              <div className="pt-2 border-t border-[#2D241E]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    Ganti Password Pribadi
                  </span>
                  <span className="text-[10px] text-stone-400 italic">
                    (Opsional)
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Password Lama {profileForm.new_password ? <span className="text-rose-400">*</span> : ''}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileForm.old_password}
                      onChange={(e) => setProfileForm({ ...profileForm, old_password: e.target.value })}
                      placeholder="Masukkan password saat ini"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#120E0C] border border-[#2D241E] text-white text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Password Baru (Min. 6 Karakter)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileForm.new_password}
                      onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                      placeholder="Kosongkan jika tidak ingin ganti"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#120E0C] border border-[#2D241E] text-white text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileForm.confirm_password}
                      onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                      placeholder="Ketik ulang password baru"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#120E0C] border border-[#2D241E] text-white text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] transition-colors"
                    />
                  </div>

                  {/* Toggle Show Password */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="toggle-show-pass"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded bg-[#120E0C] border-[#2D241E] text-[#F9610D] focus:ring-[#F9610D] cursor-pointer"
                    />
                    <label htmlFor="toggle-show-pass" className="text-xs text-stone-400 cursor-pointer select-none">
                      Lihat karakter password
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#2D241E] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={profileSubmitting}
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F9610D] hover:bg-[#d9530a] text-white shadow-lg shadow-[#F9610D]/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {profileSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
