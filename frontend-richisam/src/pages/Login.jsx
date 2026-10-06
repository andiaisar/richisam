import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, PackageSearch } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div className="min-h-screen w-full flex bg-[#F5F2EF] font-sans">
      {/* Left side: Branding / Image */}
      <div className="hidden lg:flex w-1/2 bg-[var(--color-richisam-orange)] relative overflow-hidden flex-col justify-center items-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-richisam-orange)] to-[var(--color-richisam-merah-tua)] opacity-90" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--color-richisam-kuning)] opacity-20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 text-white text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 shadow-xl">
              <PackageSearch size={64} className="text-white drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight">RichiStock</h1>
          <p className="text-lg text-white/90 max-w-md mx-auto leading-relaxed">
            Sistem Inventaris Cerdas & Terintegrasi untuk pemantauan stok real-time yang akurat.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          
          <div className="text-center relative z-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Selamat Datang</h2>
            <p className="text-gray-500 mt-2">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10 mt-8">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block ml-1">Username</label>
              <input 
                {...register('username')}
                type="text"
                placeholder="Masukkan username Anda"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-richisam-orange)] focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
              {errors.username && <p className="text-[var(--color-richisam-merah-muda)] text-xs mt-1 ml-1 font-medium">{errors.username.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block ml-1">Password</label>
              <input 
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-richisam-orange)] focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
              {errors.password && <p className="text-[var(--color-richisam-merah-muda)] text-xs mt-1 ml-1 font-medium">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-[var(--color-richisam-orange)] to-[var(--color-richisam-merah-muda)] hover:shadow-lg hover:shadow-[var(--color-richisam-orange)]/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Memproses...
                </>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;