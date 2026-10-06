import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Loader2, Boxes, User, Lock, Eye, EyeOff, ArrowRight,
  BellRing, ArrowLeftRight, FileSpreadsheet,
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const features = [
  { icon: ArrowLeftRight, title: 'Mutasi Stok Harian', desc: 'Catat stok Midnight, Pagi & Sore per cabang.' },
  { icon: BellRing, title: 'Peringatan Par Stock', desc: 'Notifikasi otomatis saat stok menyentuh batas aman.' },
  { icon: FileSpreadsheet, title: 'Laporan & Ekspor', desc: 'Rekap siap unduh dalam format Excel.' },
];

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      toast.success('Login berhasil!');
      navigate('/');
    } else {
      toast.error(res.message);
    }
  };

  const inputBase =
    'w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-[15px] text-ink placeholder:text-muted/70 ' +
    'focus:outline-none focus:ring-4 focus:ring-richisam-orange/10 focus:border-richisam-orange/60 transition-all duration-200';

  return (
    <div className="min-h-screen w-full flex bg-cream font-sans">
      {/* ── Panel kiri: Branding (arang gelap, aksen brand tipis) ── */}
      <aside className="hidden lg:flex w-[46%] relative overflow-hidden bg-ink text-white flex-col justify-between p-12 xl:p-16">
        {/* Glow lembut — bukan blok warna penuh */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-richisam-orange/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 w-[24rem] h-[24rem] rounded-full bg-richisam-merah-muda/10 blur-[120px]" />
        {/* Pola grid halus */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg shadow-richisam-orange/20">
            <img src="/logo.png" alt="Logo Richisam" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">RichiStock</p>
            <p className="text-xs text-white/50 -mt-0.5">Inventory Management</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-richisam-kuning" />
            Sistem Inventaris Terintegrasi
          </span>
          <h1 className="text-4xl xl:text-[2.75rem] font-extrabold leading-[1.15] tracking-tight text-white">
            Pantau stok setiap cabang,{' '}
            <span className="bg-gradient-to-r from-richisam-orange to-richisam-kuning bg-clip-text text-transparent">
              tanpa ribet.
            </span>
          </h1>
          <p className="mt-4 text-white/60 leading-relaxed">
            Satu dasbor untuk mutasi harian, permintaan barang, dan laporan defect antara pusat dan cabang.
          </p>

          <ul className="mt-10 space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon size={18} className="text-richisam-orange" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-white/50">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} RichiStock. All rights reserved.
        </p>
      </aside>

      {/* ── Panel kanan: Form ── */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm border border-line">
              <img src="/logo.png" alt="Logo Richisam" className="w-full h-full object-contain" />
            </div>
            <p className="text-lg font-bold text-ink">RichiStock</p>
          </div>

          <div className="mb-8">
            <h2 className="text-[1.75rem] font-bold text-ink tracking-tight">Masuk ke akun Anda</h2>
            <p className="text-muted mt-1.5">Gunakan kredensial yang diberikan oleh Admin Pusat.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-username" className="text-sm font-medium text-ink block mb-1.5">
                Username
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="login-username"
                  {...register('username')}
                  type="text"
                  autoComplete="username"
                  placeholder="contoh: staf.panakkukang"
                  className={`${inputBase} ${errors.username ? 'border-richisam-merah-muda/60' : 'border-line'}`}
                />
              </div>
              {errors.username && (
                <p className="text-richisam-merah-muda text-xs mt-1.5 font-medium">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm font-medium text-ink block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="login-password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputBase} pr-11 ${errors.password ? 'border-richisam-merah-muda/60' : 'border-line'}`}
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-ink hover:bg-sand transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-richisam-merah-muda text-xs mt-1.5 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold bg-ink hover:bg-ink-soft shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight size={18} className="text-richisam-orange group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-8">
            Lupa password? Hubungi <span className="font-medium text-ink">Admin Pusat</span>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;