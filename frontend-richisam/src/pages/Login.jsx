import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Loader2, User, Lock, Eye, EyeOff,
  HelpCircle, PhoneCall, X, ShieldCheck, Store, Warehouse, ArrowRight,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    const res = await login(data.username, data.password);
    setIsLoading(false);

    if (res.success) {
      toast.success('Login berhasil! Selamat datang.');
      navigate('/');
    } else {
      toast.error(res.message || 'Login gagal. Periksa username dan password.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#120E0C] p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#F9610D] selection:text-white relative overflow-hidden">
      {/* Background Soft Glow Ambient (Orange & Merah Halus) */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-[#F9610D]/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#EC1F27]/10 blur-[150px]" />

      {/* ── Main Container: Split Layout ── */}
      <div className="w-full max-w-6xl min-h-[640px] lg:min-h-[700px] flex flex-col lg:flex-row rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl shadow-black/80 border border-white/10 relative z-10">

        {/* ── PANEL KIRI: Showcase Logo & Brand Visual Mitra (Soft Sunset Terracotta-Crimson) ── */}
        <section
          aria-label="Branding Richisam"
          className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-14 relative overflow-hidden bg-gradient-to-br from-[#BA4F18] via-[#9C3814] to-[#6E1F0F] text-white"
        >
          {/* Soft ambient radial lighting yang diolah dari Kuning #FFCE00 & Orange #F9610D */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#FFCE00]/20 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#F9610D]/25 blur-[120px]" />
          {/* Subtle noise/texture overlay agar warnanya matte dan lembut */}
          <div className="pointer-events-none absolute inset-0 bg-black/10 mix-blend-overlay" />

          {/* Top-Left: Brand Typography & Slogan Mitra */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white drop-shadow-sm">
                RICHI<span className="text-[#FFCE00]">STOCK</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-[10px] font-bold tracking-wider text-[#FFCE00] uppercase">
                #ENAKNYA MAKANAYAM
              </span>
            </div>
            <span className="text-xs font-semibold text-white/70 hidden sm:inline-block tracking-tight">
              Richisam Chicken Hub
            </span>
          </div>

          {/* Center: Showcase Logo Richisam (Floating 3D dengan glow lembut) */}
          <div className="relative z-10 my-10 lg:my-0 flex flex-col items-center justify-center">
            {/* Ambient Radial Glow lembut di belakang logo */}
            <div className="pointer-events-none absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-[#FFCE00]/30 via-[#F9610D]/25 to-transparent blur-3xl animate-pulse" />

            {/* Container Logo dengan efek elevasi 3D & bayangan realistis */}
            <div className="relative group transition-transform duration-500 hover:scale-105">
              <img
                src="/logo.png"
                alt="Logo Resmi Richisam Chicken"
                className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 object-contain drop-shadow-[0_22px_32px_rgba(0,0,0,0.55)] transition-all duration-500 group-hover:drop-shadow-[0_28px_40px_rgba(0,0,0,0.65)]"
              />
              {/* Soft ellipse shadow di bawah logo agar terkesan mengambang/floating */}
              <div className="mx-auto -mt-3 w-40 sm:w-48 h-6 bg-black/45 blur-md rounded-full pointer-events-none group-hover:w-36 group-hover:opacity-80 transition-all duration-500" />
            </div>
          </div>

          {/* Bottom-Left: Bold Headline Typography */}
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-md">
              Pantau Cepat,<br />
              <span className="text-[#FFD782]">Kendali Tepat</span>
            </h1>
            <p className="mt-2.5 text-xs sm:text-sm font-medium text-white/85 max-w-sm leading-relaxed drop-shadow-sm">
              Sistem manajemen mutasi stok harian, batas aman par-stock, dan transfer antar cabang Richisam Chicken.
            </p>
          </div>
        </section>

        {/* ── PANEL KANAN: Dark Form Card (Velvet Soft Charcoal dengan aksen Brand Mitra) ── */}
        <section
          aria-label="Form Login"
          className="w-full lg:w-1/2 bg-[#1A1412] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-20 border-t lg:border-t-0 lg:border-l border-white/10"
        >
          <div className="w-full max-w-md mx-auto">
            {/* Header Form: 'Create Account' style -> 'Masuk ke Akun' */}
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Masuk ke Akun
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-stone-400">
                Silakan masukkan kredensial akun Anda untuk mengakses sistem
              </p>
            </div>

            {/* Form Inputs dengan Notched/Outlined Border Style */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

              {/* Field: Username */}
              <div>
                <div className="relative group">
                  {/* Label yang memotong garis border atas (Notched Label) */}
                  <label
                    htmlFor="login-username"
                    className="absolute -top-2.5 left-3.5 px-2 bg-[#1A1412] text-[11px] sm:text-xs font-semibold text-stone-400 group-focus-within:text-[#F9610D] transition-colors z-10"
                  >
                    Username
                  </label>
                  <div className="relative flex items-center">
                    <User
                      size={18}
                      className="absolute left-4 text-stone-500 group-focus-within:text-[#F9610D] transition-colors pointer-events-none"
                    />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      placeholder="contoh: staf.panakkukang"
                      {...register('username')}
                      className={`w-full bg-[#130E0C] border rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-stone-600 focus:outline-none transition-all duration-200 ${
                        errors.username
                          ? 'border-[#EC1F27] focus:ring-1 focus:ring-[#EC1F27]'
                          : 'border-stone-700/80 focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D]'
                      }`}
                    />
                  </div>
                </div>
                {errors.username && (
                  <p className="text-[#EC1F27] text-xs mt-1.5 font-medium flex items-center gap-1">
                    <span>•</span> {errors.username.message}
                  </p>
                )}
              </div>

              {/* Field: Password */}
              <div>
                <div className="relative group">
                  {/* Label yang memotong garis border atas (Notched Label) */}
                  <label
                    htmlFor="login-password"
                    className="absolute -top-2.5 left-3.5 px-2 bg-[#1A1412] text-[11px] sm:text-xs font-semibold text-stone-400 group-focus-within:text-[#F9610D] transition-colors z-10"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock
                      size={18}
                      className="absolute left-4 text-stone-500 group-focus-within:text-[#F9610D] transition-colors pointer-events-none"
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...register('password')}
                      className={`w-full bg-[#130E0C] border rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-stone-600 focus:outline-none transition-all duration-200 ${
                        errors.password
                          ? 'border-[#EC1F27] focus:ring-1 focus:ring-[#EC1F27]'
                          : 'border-stone-700/80 focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D]'
                      }`}
                    />
                    <button
                      type="button"
                      id="toggle-password"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 p-1 rounded-md text-stone-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#F9610D]"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <p className="text-[#EC1F27] text-xs mt-1.5 font-medium flex items-center gap-1">
                    <span>•</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button (Warna Orange Brand #F9610D diolah lembut & berbobot) */}
              <button
                type="submit"
                id="login-submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] active:scale-[0.99] shadow-lg shadow-[#F9610D]/25 hover:shadow-[#F9610D]/40 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group text-sm sm:text-base mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Subtext: Already have an account / Lupa Password */}
            <div className="text-center mt-5">
              <p className="text-xs text-stone-400">
                Mengalami kendala akun?{' '}
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="text-[#F9610D] hover:underline font-semibold cursor-pointer"
                >
                  Hubungi Admin Pusat
                </button>
              </p>
            </div>

            {/* Divider 'Pusat Bantuan' */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-stone-800" />
              <span className="px-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
                Pusat Bantuan
              </span>
              <div className="flex-1 border-t border-stone-800" />
            </div>

            {/* Bottom Actions: Two Outlined Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-700/80 bg-[#130E0C] hover:bg-stone-800/80 text-stone-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <HelpCircle size={15} className="text-[#F9610D] shrink-0" />
                <span>Panduan Akun</span>
              </button>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-700/80 bg-[#130E0C] hover:bg-stone-800/80 text-stone-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <PhoneCall size={15} className="text-[#FFCE00] shrink-0" />
                <span>Kontak Admin</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── MODAL: Panduan Akun ── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1412] border border-stone-700/80 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg"
              aria-label="Tutup panduan"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F9610D]/15 flex items-center justify-center text-[#F9610D]">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Struktur Akun RichiStock</h3>
                <p className="text-xs text-stone-400">Hak akses ditentukan oleh Admin Pusat</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-stone-300">
              <div className="p-3 rounded-xl bg-[#130E0C] border border-stone-800 flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#F9610D] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Admin Pusat & Owner</p>
                  <p className="text-stone-400 mt-0.5">Kelola data master outlet, produk, par stock, mutasi global, dan laporan komprehensif.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#130E0C] border border-stone-800 flex items-start gap-3">
                <Warehouse size={18} className="text-[#FFCE00] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Gudang Pusat</p>
                  <p className="text-stone-400 mt-0.5">Menerima dan memproses pengiriman bahan baku ke seluruh cabang mitra.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#130E0C] border border-stone-800 flex items-start gap-3">
                <Store size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Staf & Supervisor Cabang</p>
                  <p className="text-stone-400 mt-0.5">Input mutasi harian, pengajuan barang darurat, dan transfer antar cabang.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition-colors"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Kontak Admin ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1412] border border-stone-700/80 rounded-2xl w-full max-w-sm p-6 text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg"
              aria-label="Tutup kontak"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FFCE00]/15 flex items-center justify-center text-[#FFCE00]">
                <PhoneCall size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Bantuan Admin Pusat</h3>
                <p className="text-xs text-stone-400">Pusat kendali akun & teknis</p>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#130E0C] border border-stone-800">
                <p className="text-stone-400">WhatsApp Helpdesk:</p>
                <p className="text-white font-mono font-semibold text-sm mt-0.5">+62 812-4455-6677</p>
              </div>
              <div className="p-3 rounded-xl bg-[#130E0C] border border-stone-800">
                <p className="text-stone-400">Jam Operasional:</p>
                <p className="text-white font-semibold mt-0.5">Setiap Hari: 08.00 - 22.00 WITA</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-xs font-semibold text-white transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;