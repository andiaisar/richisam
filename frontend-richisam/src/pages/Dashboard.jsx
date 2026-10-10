import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import {
  TrendingDown,
  AlertCircle,
  Package,
  Store,
  ArrowRight,
  Activity,
  CheckCircle2,
  FileWarning,
  ArrowUpRight,
  CalendarClock
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [lowStocks, setLowStocks] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, lowRes, reqRes, batchRes] = await Promise.all([
          axiosClient.get('/reports/dashboard'),
          axiosClient.get('/stocks/low'),
          axiosClient.get('/requests?limit=5'),
          axiosClient.get('/batches/summary').catch(() => ({ data: { data: null } }))
        ]);

        setStats(statsRes.data);
        setLowStocks(lowRes.data?.slice(0, 4) || []);
        setRecentRequests(reqRes.data?.data || []);
        setBatchSummary(batchRes?.data?.data || batchRes?.data || null);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#2D241E] border-t-[#F9610D]"></div>
          <span className="text-xs font-semibold text-stone-400">Memuat data inventaris...</span>
        </div>
      </div>
    );
  }

  const roleDisplay =
    user?.role === 'ADMIN_PUSAT'
      ? 'Pusat'
      : user?.role === 'STAF_CABANG'
      ? 'Cabang'
      : user?.role === 'ADMIN_GUDANG'
      ? 'Gudang'
      : 'Owner';

  const totalProduk = stats?.total_produk || 0;
  const totalCabang = stats?.total_cabang || 0;
  const stokMenipis = stats?.total_stok_menipis || 0;
  const defectBulanIni = stats?.total_defect_bulan_ini || 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl pb-10 text-white">

      {/* ── SEKSI 1: TOP HERO METRIC BAR (Model Dashboard Referensi) ── */}
      <section className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Ambient glow lembut di sudut */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#F9610D]/10 blur-[100px]" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#241C18]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F9610D]/15 text-[#F9610D] border border-[#F9610D]/30 text-[10px] font-bold uppercase tracking-wider">
                Portal {roleDisplay}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#130E0C] border border-[#2D241E] text-xs font-medium text-stone-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Sistem Terhubung
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
              Dashboard Ikhtisar
            </h1>
          </div>

          <Link
            to="/mutasi"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#221B17] hover:bg-[#2B231E] border border-stone-700/60 text-xs font-bold text-stone-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <span>Kelola Mutasi</span>
            <ArrowUpRight size={15} className="text-[#F9610D]" />
          </Link>
        </div>

        {/* Angka Agregat Utama (Mirip Total Balance, Crypto, Fiat pada gambar referensi) */}
        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-semibold text-stone-400">Total Produk</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              {totalProduk}{' '}
              <span className="text-xs font-normal text-stone-500">Item</span>
            </p>
          </div>

          {user?.role !== 'STAF_CABANG' && (
            <div>
              <p className="text-xs font-semibold text-stone-400">Cabang Aktif</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
                {totalCabang}{' '}
                <span className="text-xs font-normal text-stone-500">Outlet</span>
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-stone-400">Stok Menipis</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight ${stokMenipis > 0 ? 'text-[#EC1F27]' : 'text-emerald-400'}`}>
              {stokMenipis}{' '}
              <span className="text-xs font-normal text-stone-500">Peringatan</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-stone-400">Defect Bulan Ini</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight ${defectBulanIni > 0 ? 'text-[#F9610D]' : 'text-stone-300'}`}>
              {defectBulanIni}{' '}
              <span className="text-xs font-normal text-stone-500">Kasus</span>
            </p>
          </div>
        </div>

        {/* Multi-Segment Color Progress Bar (Menyerupai baris warna-warni pada referensi) */}
        <div className="mt-6 pt-2">
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#120E0C]">
            <div className="h-full bg-[#F9610D]" style={{ width: '45%' }} title="Produk Aktif" />
            <div className="h-full bg-[#FFCE00]" style={{ width: '25%' }} title="Cabang Terhubung" />
            <div className="h-full bg-emerald-500" style={{ width: '20%' }} title="Stok Aman" />
            <div className="h-full bg-[#EC1F27]" style={{ width: '10%' }} title="Perlu Tindakan" />
          </div>

          {/* Sub-Legend Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 mt-3 text-[11px] font-medium text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F9610D]" />
              Katalog Produk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFCE00]" />
              Jaringan Mitra
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Tingkat Kepatuhan Par-Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EC1F27]" />
              Stok di Bawah Batas
            </span>
          </div>
        </div>
      </section>

      {/* ── RADAR KADALUARSA (FEFO ALERT BANNER) ── */}
      {((batchSummary?.metrics?.total_expired || 0) > 0 || (batchSummary?.metrics?.total_critical || 0) > 0) && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#1A1412] to-amber-950/30 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5 sm:mt-0">
              <CalendarClock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 bg-red-950/70 border border-red-500/30 px-2 py-0.5 rounded-md">
                  Peringatan FEFO Dapur
                </span>
                <span className="text-xs text-stone-400">Pilar Operasional #2</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                Terdapat {batchSummary?.metrics?.total_expired || 0} batch kadaluarsa dan {batchSummary?.metrics?.total_critical || 0} batch kritis (H ≤ 3 hari)!
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Segera prioritaskan pemakaian bahan di dapur untuk mencegah pemborosan (food waste).
              </p>
            </div>
          </div>
          <Link
            to="/kadaluarsa"
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#F9610D] hover:bg-[#d9530a] text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <span>Buka Monitoring Kadaluarsa</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── SEKSI 2: KARTU METRIK KUNCI (Model 'Wallets' pada Referensi) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Metrik & Status Operasional</span>
          </h2>
          <span className="text-xs text-stone-400 font-medium">Sinkronisasi Realtime</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kartu 1: Highlighted Focus Card (Menyerupai Kartu Ungu Ethereum di Referensi) */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-gradient-to-br from-[#BA4F18] via-[#A03E15] to-[#782810] text-white shadow-xl shadow-[#F9610D]/20 border border-white/10 relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:scale-[1.02]">
            <div className="pointer-events-none absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#FFCE00]/25 blur-2xl" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">Kondisi Par Stock</span>
                <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold text-white border border-white/20">
                  {stokMenipis === 0 ? 'Optimal' : 'Waspada'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
                {stokMenipis === 0 ? '100% Aman' : `${stokMenipis} Peringatan`}
              </p>
              <p className="text-xs text-white/80 mt-1 font-medium">
                {stokMenipis === 0 ? 'Semua produk di atas batas par stock' : 'Segera restock sebelum habis'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center p-1">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-white">RichiGuard</span>
              </div>
              <Link to="/par-stock" className="text-xs font-bold text-white hover:underline flex items-center gap-1">
                Detail <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Kartu 2: Total Produk Terdaftar */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-[#F9610D]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">Katalog Produk</span>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  +3 aktif
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {totalProduk}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                <span>Bahan Baku: <strong className="text-stone-200">Utama</strong></span>
                <span>Satuan: <strong className="text-stone-200">Kg/Pcs</strong></span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#F9610D]">
                  <Package size={15} />
                </div>
                <span className="text-xs font-semibold text-white">Item Master</span>
              </div>
              <Link to="/products" className="text-xs font-semibold text-[#F9610D] hover:underline">
                Kelola
              </Link>
            </div>
          </div>

          {/* Kartu 3: Jaringan Cabang (atau Inventaris Peralatan jika staf cabang) */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-[#FFCE00]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">
                  {user?.role === 'STAF_CABANG' ? 'Inventaris Peralatan' : 'Outlet & Cabang'}
                </span>
                <span className="text-[11px] font-bold text-[#FFCE00]">
                  {user?.role === 'STAF_CABANG' ? 'Terdata' : 'Beroperasi'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {user?.role === 'STAF_CABANG' ? 'Aset Cabang' : `${totalCabang} Mitra`}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {user?.role === 'STAF_CABANG' ? 'Peralatan operasional harian' : 'Makassar & Wilayah Sekitarnya'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#FFCE00]">
                  <Store size={15} />
                </div>
                <span className="text-xs font-semibold text-white">
                  {user?.role === 'STAF_CABANG' ? 'Aset Fisik' : 'Jaringan Cabang'}
                </span>
              </div>
              <Link
                to={user?.role === 'STAF_CABANG' ? '/assets' : '/outlets'}
                className="text-xs font-semibold text-[#FFCE00] hover:underline"
              >
                Buka
              </Link>
            </div>
          </div>

          {/* Kartu 4: Laporan Defect & Kerusakan */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-[#EC1F27]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">Laporan Defect</span>
                <span className={`text-[11px] font-bold ${defectBulanIni > 0 ? 'text-[#EC1F27]' : 'text-stone-500'}`}>
                  Bulan Ini
                </span>
              </div>
              <p className={`text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight ${defectBulanIni > 0 ? 'text-[#EC1F27]' : 'text-stone-300'}`}>
                {defectBulanIni} Kasus
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {defectBulanIni > 0 ? 'Barang rusak / BS tercatat' : 'Nihil kerusakan tercatat'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#EC1F27]">
                  <AlertCircle size={15} />
                </div>
                <span className="text-xs font-semibold text-white">Inspeksi BS</span>
              </div>
              <Link to="/defect" className="text-xs font-semibold text-[#EC1F27] hover:underline">
                Rekap
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEKSI 3: SUMMARY LISTS & RECENT TRANSACTIONS (Model 'Summary' pada Referensi) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Kolom Kiri: Peringatan Stok Menipis */}
        <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EC1F27]/15 flex items-center justify-center text-[#EC1F27] border border-[#EC1F27]/25">
                  <TrendingDown size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Peringatan Stok Menipis</h3>
                  <p className="text-[11px] text-stone-400">Produk yang menyentuh batas kritis par stock</p>
                </div>
              </div>
              <Link
                to="/par-stock"
                className="text-xs font-bold text-[#F9610D] hover:underline flex items-center gap-1"
              >
                Lihat Semua <ArrowRight size={13} />
              </Link>
            </div>

            {/* List Items dengan Pill Container Shape */}
            <div className="mt-4 space-y-3">
              {lowStocks.length > 0 ? (
                lowStocks.map((item, idx) => (
                  <div
                    key={`${item.outlet_id}-${item.product_id}-${idx}`}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#140F0D] border border-[#2D241E] hover:border-[#EC1F27]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#EC1F27] shrink-0">
                        <Package size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white group-hover:text-[#EC1F27] transition-colors truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{item.outlet_name}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <p className="text-base sm:text-lg font-black text-white">{item.qty_current}</p>
                      <span className="px-2 py-0.5 rounded-full bg-[#EC1F27]/15 text-[#EC1F27] border border-[#EC1F27]/30 text-[10px] font-extrabold uppercase tracking-wide">
                        Sisa Stok
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-[#140F0D] border border-[#241C18]">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                  <p className="font-bold text-sm text-white">Stok Dalam Batas Aman</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                    Seluruh bahan baku di setiap outlet saat ini mencukupi standar operasional.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#241C18] flex items-center justify-between text-xs text-stone-400">
            <span>Sistem Peringatan Otomatis</span>
            <span className="text-[#F9610D] font-semibold">Batas Aman Terlindungi</span>
          </div>
        </div>

        {/* Kolom Kanan: Permintaan Barang Terakhir & Mini Bar Widget */}
        <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFCE00]/15 flex items-center justify-center text-[#FFCE00] border border-[#FFCE00]/25">
                  <Activity size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Permintaan Terakhir</h3>
                  <p className="text-[11px] text-stone-400">Tiket restock dan distribusi barang antar unit</p>
                </div>
              </div>
              <Link
                to="/permintaan"
                className="text-xs font-bold text-[#F9610D] hover:underline flex items-center gap-1"
              >
                Lihat Semua <ArrowRight size={13} />
              </Link>
            </div>

            {/* List Items dengan Pill Container Shape */}
            <div className="mt-4 space-y-3">
              {recentRequests.length > 0 ? (
                recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#140F0D] border border-[#2D241E] hover:border-[#F9610D]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-white group-hover:text-[#F9610D] transition-colors truncate">
                          {req.product_name}
                        </p>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-stone-400 mt-1 truncate">
                        Oleh <strong className="text-stone-300 font-medium">{req.creator_name}</strong> • {req.outlet_name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-extrabold text-white">{req.qty_requested} unit</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-[#140F0D] border border-[#241C18]">
                  <FileWarning size={32} className="mx-auto text-stone-500 mb-2" />
                  <p className="font-bold text-sm text-white">Belum Ada Permintaan</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                    Tidak ada tiket pengajuan restock yang sedang berjalan saat ini.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mini Visual Bar Chart Decorative (Menyerupai chart batang pada kanan-bawah referensi) */}
          <div className="mt-5 pt-4 border-t border-[#241C18]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-stone-400 font-medium">Distribusi Aktivitas Hari Ini</span>
              <span className="text-emerald-400 font-bold">+5.4% Efisiensi</span>
            </div>
            <div className="h-9 flex items-end gap-1.5 px-2 py-1 bg-[#140F0D] rounded-xl border border-[#241C18]">
              <span className="flex-1 bg-[#F9610D]/70 rounded-sm h-[40%]" />
              <span className="flex-1 bg-[#F9610D] rounded-sm h-[65%]" />
              <span className="flex-1 bg-[#FFCE00] rounded-sm h-[90%]" />
              <span className="flex-1 bg-[#FFCE00]/70 rounded-sm h-[50%]" />
              <span className="flex-1 bg-emerald-500 rounded-sm h-[80%]" />
              <span className="flex-1 bg-emerald-500/70 rounded-sm h-[45%]" />
              <span className="flex-1 bg-[#F9610D] rounded-sm h-[100%]" />
              <span className="flex-1 bg-[#FFCE00] rounded-sm h-[60%]" />
              <span className="flex-1 bg-[#EC1F27] rounded-sm h-[30%]" />
              <span className="flex-1 bg-emerald-400 rounded-sm h-[75%]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Status Badge Helper Component dengan Pill Styling
const StatusBadge = ({ status }) => {
  const styles = {
    DIAJUKAN: 'bg-[#FFCE00]/15 text-[#FFCE00] border-[#FFCE00]/30',
    DIPROSES: 'bg-[#F9610D]/15 text-[#F9610D] border-[#F9610D]/30',
    DIKIRIM: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    SELESAI: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };

  const className = styles[status] || 'bg-stone-800 text-stone-300 border-stone-700';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide border uppercase ${className}`}>
      {status}
    </span>
  );
};

export default Dashboard;
