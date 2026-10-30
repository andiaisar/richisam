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
  CalendarClock,
  X,
  Search,
  AlertTriangle,
  Plus,
  ExternalLink,
  Filter,
  UserCheck,
  RotateCcw,
  ClipboardCheck,
  Wrench
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { Link, useNavigate } from 'react-router-dom';
import VisualChartsSection from '../components/VisualChartsSection';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const isExecutive = user?.role === 'OWNER' || user?.role === 'ADMIN_PUSAT';

  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [stats, setStats] = useState(null);
  const [lowStocks, setLowStocks] = useState([]);
  const [allLowStocks, setAllLowStocks] = useState([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [searchLowStock, setSearchLowStock] = useState('');
  const [filterLowStockStatus, setFilterLowStockStatus] = useState('ALL');
  const [recentRequests, setRecentRequests] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isExecutive) {
      axiosClient
        .get('/outlets')
        .then((res) => {
          const list = res?.data?.data || res?.data || [];
          setOutlets(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, [isExecutive]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const outletQuery = isExecutive && selectedOutletId ? `?outlet_id=${selectedOutletId}` : '';
        const reqQuery = isExecutive && selectedOutletId ? `?limit=15&outlet_id=${selectedOutletId}` : '?limit=15';

        const [statsRes, lowRes, reqRes, batchRes] = await Promise.all([
          axiosClient.get(`/reports/dashboard${outletQuery}`).catch(() => null),
          axiosClient.get(`/stocks/low${outletQuery}`).catch(() => ({ data: [] })),
          axiosClient.get(`/requests${reqQuery}`).catch(() => ({ data: [] })),
          axiosClient.get(`/batches/summary${outletQuery}`).catch(() => ({ data: { data: null } }))
        ]);

        if (statsRes) {
          setStats(statsRes.data || statsRes);
        }

        const rawLowList = Array.isArray(lowRes?.data) ? lowRes.data : (lowRes?.data?.data || []);
        const filteredLowList =
          isExecutive && selectedOutletId
            ? rawLowList.filter((item) => String(item.outlet_id) === String(selectedOutletId))
            : rawLowList;

        setAllLowStocks(filteredLowList);
        setLowStocks(filteredLowList.slice(0, 4));

        const rawReqs = Array.isArray(reqRes?.data) ? reqRes.data : (reqRes?.data?.data || []);
        const filteredReqs =
          isExecutive && selectedOutletId
            ? rawReqs.filter((r) => String(r.outlet_id) === String(selectedOutletId))
            : rawReqs;
        setRecentRequests(filteredReqs.slice(0, 5));

        setBatchSummary(batchRes?.data?.data || batchRes?.data || null);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isExecutive, selectedOutletId]);

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#2D241E] border-t-[#F9610D]"></div>
          <span className="text-xs font-semibold text-stone-400">Memuat data inventaris...</span>
        </div>
      </div>
    );
  }

  const isCKAccount =
    user?.role === 'ADMIN_GUDANG' ||
    (user?.role === 'STAF_CABANG' &&
      (Number(user?.outlet_id) === 1 ||
        user?.outlet_name?.toLowerCase().includes('central kitchen') ||
        user?.outlet_name?.toLowerCase().includes('ck')));

  const roleDisplay =
    user?.role === 'ADMIN_PUSAT'
      ? 'Admin Pusat'
      : isCKAccount
      ? 'Central Kitchen (CK)'
      : user?.role === 'STAF_CABANG'
      ? user?.outlet_name || 'Outlet Cabang'
      : 'Owner';

  const dashboardTitle =
    user?.role === 'OWNER'
      ? `Dashboard Owner — ${user?.nama || 'Owner Bos'}`
      : user?.role === 'ADMIN_PUSAT'
      ? `Dashboard Admin Pusat — ${user?.nama || 'Admin Pusat'}`
      : isCKAccount
      ? `Dashboard Central Kitchen — ${user?.nama || 'Staf CK'}`
      : `Dashboard ${user?.outlet_name || 'Outlet Cabang'} — ${user?.nama || 'Staf Cabang'}`;

  const selectedOutletObj = outlets.find((o) => String(o.id) === String(selectedOutletId));
  const activeScopeLabel = selectedOutletObj
    ? selectedOutletObj.nama
    : isExecutive
    ? 'Semua Unit (Konsolidasi Pusat & Cabang)'
    : user?.outlet_name || roleDisplay;

  const totalProduk = stats?.total_produk || 0;
  const totalCabang = stats?.total_cabang || 0;
  const stokMenipis = stats?.total_stok_menipis || 0;
  const defectBulanIni = stats?.total_defect_bulan_ini || 0;
  const totalNilaiPersediaan = stats?.total_nilai_persediaan || 0;
  const nilaiPemakaianBulanIni = stats?.nilai_pemakaian_bulan_ini || 0;
  const totalMasukBulanIni = stats?.total_masuk_bulan_ini || 0;
  const totalKeluarBulanIni = stats?.total_keluar_bulan_ini || 0;
  const branchPerformance = stats?.branch_performance || [];
  const assetStats = stats?.assets || { total_unit: 0, total_baik: 0, total_rusak: 0, total_jenis: 0 };
  const reqSummary = stats?.requests_summary || {
    total_aktif: recentRequests.filter((r) => ['DIAJUKAN', 'DIPROSES', 'DIKIRIM'].includes(r.status)).length,
    total_diajukan: recentRequests.filter((r) => r.status === 'DIAJUKAN').length,
    total_diproses: recentRequests.filter((r) => r.status === 'DIPROSES').length,
    total_dikirim: recentRequests.filter((r) => r.status === 'DIKIRIM').length,
    total_selesai_bulan_ini: recentRequests.filter((r) => r.status === 'SELESAI').length
  };
  const opnSummary = stats?.opname_summary || {
    total_final_bulan_ini: 0,
    total_draft_aktif: 0,
    shift_closed_hari_ini: 0
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl pb-10 text-white">

      <section className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#241C18]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F9610D]/15 border border-[#F9610D]/30 text-[#F9610D] text-[11px] font-bold">
                <UserCheck size={13} />
                <span>Login Aktif: {user?.nama || user?.username} ({roleDisplay})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#221B17] border border-[#2D241E] text-stone-300 text-[11px] font-semibold">
                <Store size={12} className="text-[#FFCE00]" />
                <span>Cakupan Data: {activeScopeLabel}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {dashboardTitle}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Portal {roleDisplay} • Ringkasan valuasi persediaan, distribusi logistik, dan performa {selectedOutletObj ? selectedOutletObj.nama : 'cabang'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isExecutive && (
              <div className="flex items-center gap-2 bg-[#140F0D] border border-[#2D241E] px-3 py-2 rounded-xl">
                <Filter size={14} className="text-[#F9610D] shrink-0" />
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                  aria-label="Filter Unit atau Cabang di Dashboard"
                >
                  <option value="" className="bg-[#1A1412] text-white">
                    Semua Unit (Konsolidasi)
                  </option>
                  {outlets.map((o) => (
                    <option key={o.id} value={String(o.id)} className="bg-[#1A1412] text-white">
                      {o.nama} ({o.tipe === 'PUSAT' ? 'Pusat/CK' : 'Cabang'})
                    </option>
                  ))}
                </select>
                {selectedOutletId && (
                  <button
                    type="button"
                    onClick={() => setSelectedOutletId('')}
                    title="Reset ke Semua Unit"
                    className="p-1 rounded-lg bg-[#221B17] hover:bg-[#2D241E] text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            )}

            {isExecutive && (
              <Link
                to="/laporan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F9610D] hover:bg-[#d9530a] text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
              >
                <span>Rekap Bulanan Mitra</span>
                <ArrowUpRight size={15} />
              </Link>
            )}
            <Link
              to={user?.role === 'OWNER' ? '/analytics' : '/mutasi'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#221B17] hover:bg-[#2B231E] border border-stone-700/60 text-xs font-bold text-stone-200 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <span>{user?.role === 'OWNER' ? 'Analitik & Prediksi' : 'Kelola Mutasi'}</span>
              <ArrowUpRight size={15} className="text-[#F9610D]" />
            </Link>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-semibold text-stone-400">Valuasi Persediaan Aktif</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#FFCE00] mt-1.5 tracking-tight">
              Rp {totalNilaiPersediaan.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">{totalProduk} jenis bahan baku terdaftar</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-stone-400">Nilai Pemakaian Bulan Ini</p>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 tracking-tight">
              Rp {nilaiPemakaianBulanIni.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              +{totalMasukBulanIni.toLocaleString('id-ID')} masuk / -{totalKeluarBulanIni.toLocaleString('id-ID')} keluar
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-stone-400">Stok Menipis (Par Stock)</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight ${stokMenipis > 0 ? 'text-[#EC1F27]' : 'text-emerald-400'}`}>
              {stokMenipis}{' '}
              <span className="text-xs font-normal text-stone-500">Peringatan</span>
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {user?.role !== 'STAF_CABANG' ? `Pada ${totalCabang} outlet cabang aktif` : 'Perlu pengajuan restock'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-stone-400">Defect Bulan Ini</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight ${defectBulanIni > 0 ? 'text-[#F9610D]' : 'text-stone-300'}`}>
              {defectBulanIni}{' '}
              <span className="text-xs font-normal text-stone-500">Unit</span>
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">Barang rusak / afkir disetujui</p>
          </div>
        </div>
      </section>

      {/* ── RADAR KADALUARSA (FEFO ALERT BANNER) ── */}
      {((batchSummary?.metrics?.total_expired || 0) > 0 || (batchSummary?.metrics?.total_critical || 0) > 0) && (
        <div className="banner-fefo-alert p-5 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#1A1412] to-amber-950/30 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="banner-fefo-icon h-10 w-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5 sm:mt-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="banner-fefo-badge text-xs font-black uppercase tracking-wider text-red-400 bg-red-950/70 border border-red-500/30 px-2 py-0.5 rounded-md">
                  Peringatan FEFO Dapur
                </span>
              </div>
              <p className="banner-fefo-title text-sm font-bold text-white mt-1">
                Terdapat {batchSummary?.metrics?.total_expired || 0} batch kadaluarsa dan {batchSummary?.metrics?.total_critical || 0} batch kritis (H ≤ 3 hari)!
              </p>
              <p className="banner-fefo-desc text-xs text-stone-400 mt-0.5">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Metrik & Status Operasional</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-par-stock rounded-2xl sm:rounded-3xl p-5 bg-gradient-to-br from-[#BA4F18] via-[#A03E15] to-[#782810] text-white shadow-xl shadow-[#F9610D]/20 border border-white/10 relative overflow-hidden flex flex-col justify-between group transition-all duration-300">
            <div>
              <div className="flex items-center justify-between">
                <span className="card-par-label text-xs font-bold uppercase tracking-wider text-white/80">Kondisi Par Stock</span>
                <span className="card-par-badge px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold text-white border border-white/20">
                  {stokMenipis === 0 ? 'Optimal' : 'Waspada'}
                </span>
              </div>
              <p className="card-par-value text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
                {stokMenipis === 0 ? '100% Aman' : `${stokMenipis} Peringatan`}
              </p>
              <p className="card-par-desc text-xs text-white/80 mt-1 font-medium">
                {stokMenipis === 0 ? 'Semua produk di atas batas par stock' : 'Segera restock sebelum habis'}
              </p>
            </div>

            <div className="card-par-footer mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center p-1">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-white">Par Stock</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(true)}
                className="text-xs font-bold text-white hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                Detail <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Kartu 2: Antrean Tiket Restock & Distribusi Logistik */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-[#F9610D]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">Tiket Permintaan Stok</span>
                {reqSummary.total_aktif > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F9610D]/15 text-[#F9610D] border border-[#F9610D]/30">
                    {reqSummary.total_aktif} Berjalan
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Terkendali
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {reqSummary.total_aktif > 0
                  ? `${reqSummary.total_aktif} Antrean`
                  : `${reqSummary.total_selesai_bulan_ini} Selesai`}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-stone-400">
                {reqSummary.total_aktif > 0 ? (
                  <>
                    <span className="text-[#FFCE00] font-semibold">{reqSummary.total_diajukan} Menunggu</span>
                    <span>•</span>
                    <span className="text-[#F9610D] font-semibold">{reqSummary.total_diproses + reqSummary.total_dikirim} Dikirim/Proses</span>
                  </>
                ) : (
                  <span>{reqSummary.total_selesai_bulan_ini} distribusi restock selesai bulan ini</span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#F9610D]">
                  <Activity size={15} />
                </div>
                <span className="text-xs font-semibold text-white">Logistik & Restock</span>
              </div>
              <Link to="/permintaan" className="text-xs font-semibold text-[#F9610D] hover:underline">
                {reqSummary.total_aktif > 0 ? 'Proses' : 'Buka'}
              </Link>
            </div>
          </div>

          {/* Kartu 3: Inventaris Peralatan Fisik */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-[#FFCE00]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">
                  Inventaris Peralatan
                </span>
                {assetStats.total_rusak > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    {assetStats.total_rusak} Rusak
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Semua Baik
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {assetStats.total_unit.toLocaleString('id-ID')} Unit
              </p>
              <div className="text-xs text-stone-400 mt-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-emerald-400 font-semibold">{assetStats.total_baik.toLocaleString('id-ID')} Baik</span>
                  {assetStats.total_rusak > 0 && (
                    <span className="text-rose-400 font-semibold">• {assetStats.total_rusak} Rusak</span>
                  )}
                  <span className="text-stone-500">({assetStats.total_jenis} jenis alat)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-[#FFCE00]">
                  <Wrench size={15} />
                </div>
                <span className="text-xs font-semibold text-white">
                  Aset Peralatan
                </span>
              </div>
              <Link
                to="/assets"
                className="text-xs font-semibold text-[#FFCE00] hover:underline"
              >
                Kelola
              </Link>
            </div>
          </div>

          {/* Kartu 4: Status Audit Stok Opname & Kepatuhan Shift */}
          <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">Audit Opname & Shift</span>
                {opnSummary.total_draft_aktif > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {opnSummary.total_draft_aktif} Draf Menunggu
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Bulan Ini
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {opnSummary.total_draft_aktif > 0
                  ? `${opnSummary.total_draft_aktif} Draf Opname`
                  : `${opnSummary.total_final_bulan_ini} Opname Final`}
              </p>
              <p className="text-xs text-stone-400 mt-1.5">
                <strong className="text-stone-200">{opnSummary.total_final_bulan_ini} Final</strong> bulan ini •{' '}
                <strong className="text-emerald-400">{opnSummary.shift_closed_hari_ini} Shift</strong> tutup buku hari ini
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#241C18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-300">
                <div className="w-7 h-7 rounded-lg bg-[#221B17] border border-[#2D241E] flex items-center justify-center text-emerald-400">
                  <ClipboardCheck size={15} />
                </div>
                <span className="text-xs font-semibold text-white">Stok Opname</span>
              </div>
              <Link to="/opname" className="text-xs font-semibold text-emerald-400 hover:underline">
                {opnSummary.total_draft_aktif > 0 ? 'Validasi' : 'Buka'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEKSI PANTAUAN PERFORMA & KESEHATAN SELURUH CABANG (OWNER & ADMIN PUSAT) ── */}
      {isExecutive && branchPerformance.length > 0 && (
        <section className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#241C18]">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <Store size={18} className="text-[#F9610D]" />
                Pantauan Perkembangan & Kesehatan Stok Seluruh Cabang
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Klik salah satu baris cabang di bawah untuk memfilter seluruh indikator dan grafik Dashboard ke cabang tersebut.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {selectedOutletId && (
                <button
                  type="button"
                  onClick={() => setSelectedOutletId('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221B17] hover:bg-[#2D241E] border border-[#F9610D]/40 text-xs font-bold text-[#F9610D] cursor-pointer transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Tampilkan Semua Unit</span>
                </button>
              )}
              <Link
                to="/laporan"
                className="text-xs font-bold text-[#F9610D] hover:underline flex items-center gap-1"
              >
                <span>Buka Rekap Bulanan Lengkap</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Unit / Cabang</th>
                  <th className="py-3 px-3 text-right">Valuasi Stok Saat Ini</th>
                  <th className="py-3 px-3 text-right">Arus Bulan Ini (In / Out)</th>
                  <th className="py-3 px-3 text-right">Nilai Konsumsi Bulan Ini</th>
                  <th className="py-3 px-3 text-center">Kesehatan Par-Stock</th>
                  <th className="py-3 px-3 text-center">Defect Bulan Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241C18]">
                {branchPerformance.map((bp) => {
                  const isSelectedRow = String(bp.id) === String(selectedOutletId);
                  return (
                    <tr
                      key={bp.id}
                      onClick={() =>
                        setSelectedOutletId(isSelectedRow ? '' : String(bp.id))
                      }
                      title="Klik untuk memfilter Dashboard ke unit ini"
                      className={`cursor-pointer transition-colors ${
                        isSelectedRow
                          ? 'bg-[#F9610D]/10 hover:bg-[#F9610D]/15'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{bp.nama}</span>
                          {isSelectedRow && (
                            <span className="px-2 py-0.5 rounded-full bg-[#F9610D] text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Sedang Dipantau
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 uppercase font-semibold">
                          {bp.tipe === 'PUSAT' ? 'Central Kitchen / Gudang Pusat' : 'Cabang Mitra'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-[#FFCE00] font-mono">
                        Rp {bp.nilai_stok.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        <span className="text-emerald-400 font-bold">+{bp.masuk_bulan_ini.toLocaleString('id-ID')}</span>
                        {' / '}
                        <span className="text-[#F9610D] font-bold">-{bp.keluar_bulan_ini.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-white font-mono">
                        Rp {bp.nilai_keluar_bulan_ini.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {bp.stok_kritis > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                            {bp.stok_kritis} Item Kritis
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            100% Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          bp.defect_bulan_ini > 0
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'text-stone-400'
                        }`}>
                          {bp.defect_bulan_ini > 0 ? `${bp.defect_bulan_ini} Unit` : 'Nihil'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <VisualChartsSection
        initialOutletId={selectedOutletId}
        onOutletChange={(val) => setSelectedOutletId(val)}
      />

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
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(true)}
                className="text-xs font-bold text-[#F9610D] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                Lihat Semua ({allLowStocks.length}) <ArrowRight size={13} />
              </button>
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

          <div className="mt-5 pt-3 border-t border-[#241C18] flex items-center justify-between text-xs text-stone-400">
            <span>Distribusi & Logistik Cabang</span>
            <span className="text-[#F9610D] font-semibold">{recentRequests.length} Tiket Ditampilkan</span>
          </div>
        </div>
      </section>

      {/* ── MODAL POP-UP: DAFTAR STOK KRITIS & KEBUTUHAN RESTOCK (OPSI 1) ── */}
      {isLowStockModalOpen && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in ${
          isLight ? 'bg-black/45' : 'bg-black/75'
        }`}>
          <div className={`rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col transition-colors ${
            isLight
              ? 'bg-white border border-[#E8DED3] text-[#140F0D]'
              : 'bg-[#1A1412] border border-[#2D241E] text-white'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0 transition-colors ${
              isLight
                ? 'bg-white border-[#E8DED3]'
                : 'bg-[#140F0D] border-[#2D241E]'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isLight
                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                    : 'bg-[#EC1F27]/15 border border-[#EC1F27]/30 text-[#EC1F27]'
                }`}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg sm:text-xl font-black tracking-tight ${
                      isLight ? 'text-[#140F0D]' : 'text-white'
                    }`}>
                      Daftar Stok Kritis & Kebutuhan Restock
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isLight
                        ? 'bg-rose-50 border border-rose-200 text-rose-700'
                        : 'bg-[#EC1F27]/20 border border-[#EC1F27]/30 text-[#EC1F27]'
                    }`}>
                      {allLowStocks.length} Item
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-[#66564B]' : 'text-stone-400'}`}>
                    {user?.role === 'STAF_CABANG'
                      ? `Monitoring stok kritis khusus ${user?.outlet_name || 'Outlet Cabang'} yang berada di bawah batas minimum par stock.`
                      : 'Monitoring konsolidasi produk dari semua cabang yang berada di bawah batas aman.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  isLight
                    ? 'bg-[#F9F5F0] hover:bg-[#F0E8DE] border border-[#E8DED3] text-[#66564B] hover:text-[#140F0D]'
                    : 'bg-[#241B17] hover:bg-[#2F231E] border border-stone-700/50 text-stone-400 hover:text-white'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-header: Quick Badges & Search Filter */}
            <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 transition-colors ${
              isLight
                ? 'bg-[#F9F5F0] border-[#E8DED3]'
                : 'bg-[#140F0D] border-[#241C18]'
            }`}>
              {/* Filter Tabs / Badges */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterLowStockStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    filterLowStockStatus === 'ALL'
                      ? 'bg-[#F9610D] text-white shadow-md shadow-[#F9610D]/20'
                      : isLight
                      ? 'bg-white text-[#4A3E36] hover:bg-[#F0E8DE] border border-[#D4C5B5]'
                      : 'bg-[#201815] text-stone-400 hover:text-white border border-[#2D241E]'
                  }`}
                >
                  Semua ({allLowStocks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLowStockStatus('HABIS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    filterLowStockStatus === 'HABIS'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : isLight
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-[#201815] text-rose-400 hover:text-rose-300 border border-[#2D241E]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  Habis Total ({allLowStocks.filter((i) => Number(i.qty_current) === 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLowStockStatus('KRITIS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    filterLowStockStatus === 'KRITIS'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : isLight
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      : 'bg-[#201815] text-amber-400 hover:text-amber-300 border border-[#2D241E]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Stok Menipis ({allLowStocks.filter((i) => Number(i.qty_current) > 0).length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
                  isLight ? 'text-[#8C7A6B]' : 'text-stone-400'
                }`} />
                <input
                  type="text"
                  value={searchLowStock}
                  onChange={(e) => setSearchLowStock(e.target.value)}
                  placeholder="Cari nama bahan baku..."
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs transition-colors focus:outline-none focus:border-[#F9610D] ${
                    isLight
                      ? 'bg-white border border-[#D4C5B5] text-[#140F0D] placeholder-[#8C7A6B]'
                      : 'bg-[#1C1513] border border-[#2E241E] text-white placeholder-stone-500'
                  }`}
                />
              </div>
            </div>

            {/* Table Area (Scrollable) */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 min-h-[260px] max-h-[50vh] transition-colors ${
              isLight ? 'bg-[#FAF7F2]' : 'bg-[#140F0D]'
            }`}>
              {(() => {
                const filtered = allLowStocks.filter((item) => {
                  const q = searchLowStock.toLowerCase();
                  const matches =
                    !searchLowStock ||
                    item.product_name?.toLowerCase().includes(q) ||
                    item.outlet_name?.toLowerCase().includes(q);

                  if (!matches) return false;
                  if (filterLowStockStatus === 'HABIS') return Number(item.qty_current) === 0;
                  if (filterLowStockStatus === 'KRITIS') return Number(item.qty_current) > 0;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className={`py-12 text-center rounded-2xl border ${
                      isLight
                        ? 'bg-white border-[#E8DED3]'
                        : 'bg-[#140F0D] border-[#241C18]'
                    }`}>
                      <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                      <p className={`font-bold text-sm ${isLight ? 'text-[#140F0D]' : 'text-white'}`}>
                        Tidak ada data stok menipis
                      </p>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-[#66564B]' : 'text-stone-400'}`}>
                        {searchLowStock
                          ? 'Tidak ditemukan bahan baku dengan kata kunci pencarian tersebut.'
                          : 'Semua bahan baku cabang dalam kondisi aman di atas batas par stock.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className={`overflow-x-auto rounded-2xl border ${
                    isLight ? 'bg-white border-[#E8DED3]' : 'border-[#2D241E]'
                  }`}>
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className={`font-bold uppercase tracking-wider border-b ${
                        isLight
                          ? 'bg-[#F9F5F0] text-[#4A3E36] border-[#E8DED3]'
                          : 'bg-[#201815] text-stone-400 border-[#2D241E]'
                      }`}>
                        <tr>
                          <th className="px-4 py-3">Bahan Baku</th>
                          {user?.role === 'ADMIN_PUSAT' && <th className="px-4 py-3">Cabang</th>}
                          <th className="px-4 py-3 text-center">Stok Fisik Saat Ini</th>
                          <th className="px-4 py-3 text-center">Batas Minimum (Par)</th>
                          <th className="px-4 py-3 text-center">Kebutuhan Restock</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isLight
                          ? 'bg-white divide-[#EFE8DE]'
                          : 'bg-[#140F0D] divide-[#241C18]'
                      }`}>
                        {filtered.map((item, idx) => {
                          const isZero = Number(item.qty_current) === 0;
                          return (
                            <tr key={`${item.outlet_id}-${item.product_id}-${idx}`} className={`transition-colors ${
                              isLight ? 'hover:bg-[#FFF8F3]' : 'hover:bg-[#1D1613]'
                            }`}>
                              <td className="px-4 py-3.5 font-bold">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isZero ? 'bg-red-500' : 'bg-amber-500'}`} />
                                  <div>
                                    <p className={`font-bold ${isLight ? 'text-[#140F0D]' : 'text-white'}`}>
                                      {item.product_name}
                                    </p>
                                    <span className={`text-[10px] font-normal ${isLight ? 'text-[#66564B]' : 'text-stone-400'}`}>
                                      Satuan: {item.satuan}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              {user?.role === 'ADMIN_PUSAT' && (
                                <td className={`px-4 py-3.5 font-medium ${isLight ? 'text-[#4A3E36]' : 'text-stone-300'}`}>
                                  {item.outlet_name}
                                </td>
                              )}
                              <td className="px-4 py-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                  isZero
                                    ? isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#EC1F27]/20 text-[#EC1F27] border border-[#EC1F27]/30'
                                    : isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {item.qty_current} {item.satuan}
                                </span>
                              </td>
                              <td className={`px-4 py-3.5 text-center font-bold ${isLight ? 'text-[#4A3E36]' : 'text-stone-300'}`}>
                                {item.min_qty} {item.satuan}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                  isLight
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-red-950/40 text-red-300 border border-red-800/40'
                                }`}>
                                  Kurang {item.selisih} {item.satuan}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {isZero ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                    isLight
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-[#EC1F27]/20 text-[#EC1F27] border border-[#EC1F27]/40'
                                  }`}>
                                    ● Habis Total
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                    isLight
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-[#FFCE00]/20 text-[#FFCE00] border border-[#FFCE00]/40'
                                  }`}>
                                    ▲ Stok Kritis
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {user?.role === 'STAF_CABANG' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsLowStockModalOpen(false);
                                      navigate('/permintaan', {
                                        state: {
                                          openAddModal: true,
                                          product_id: item.product_id,
                                          qty_needed: item.selisih > 0 ? item.selisih : item.min_qty
                                        }
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F9610D] to-[#BA4F18] text-white font-bold text-[11px] hover:brightness-110 shadow-sm transition-all cursor-pointer"
                                  >
                                    <Plus size={13} />
                                    Minta Restock
                                  </button>
                                ) : (
                                  <Link
                                    to="/par-stock"
                                    onClick={() => setIsLowStockModalOpen(false)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                                      isLight
                                        ? 'bg-[#F9F5F0] hover:bg-[#F0E8DE] border border-[#D4C5B5] text-[#241B16]'
                                        : 'bg-[#241C18] hover:bg-[#2E231E] border border-stone-700/60 text-stone-200'
                                    }`}
                                  >
                                    Atur Par
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 transition-colors ${
              isLight
                ? 'bg-[#F9F5F0] border-[#E8DED3]'
                : 'bg-[#140F0D] border-[#241C18]'
            }`}>
              <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-[#66564B]' : 'text-stone-400'}`}>
                <span className="text-[#F9610D] font-bold">💡 Tip Operasional:</span>
                <span>Klik tombol <b>Minta Restock</b> untuk membuat tiket permintaan barang ke Gudang / Central Kitchen (CK).</span>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsLowStockModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-[#F0E8DE] border border-[#D4C5B5] text-[#241B16]'
                      : 'bg-[#221B17] hover:bg-[#2B221D] border border-stone-700 text-stone-300 hover:text-white'
                  }`}
                >
                  Tutup
                </button>

                {user?.role === 'STAF_CABANG' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLowStockModalOpen(false);
                      navigate('/permintaan', { state: { openAddModal: true } });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F9610D] to-[#BA4F18] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[#F9610D]/20 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    Ajukan Permintaan Barang
                  </button>
                ) : (
                  <Link
                    to="/par-stock"
                    onClick={() => setIsLowStockModalOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F9610D] to-[#BA4F18] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[#F9610D]/20 transition-all"
                  >
                    <ExternalLink size={14} />
                    Buka Pengaturan Par Stock
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
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
