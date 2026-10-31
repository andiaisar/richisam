import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  User,
  Store,
  Layers,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Clock,
  Eye,
  KeyRound,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const MODULE_OPTIONS = [
  { value: '', label: 'Semua Modul' },
  { value: 'MUTASI', label: 'Mutasi Stok Harian' },
  { value: 'OPNAME', label: 'Stok Opname & Valuasi' },
  { value: 'PERMINTAAN', label: 'Tiket Permintaan & Cito' },
  { value: 'TRANSFER', label: 'Transfer Antar Cabang' },
  { value: 'SHIFT', label: 'Tutup Buku Shift' },
  { value: 'DEFECT', label: 'Defect & Barang Rusak' },
  { value: 'KADALUARSA', label: 'Batch & Expired (FEFO)' },
  { value: 'SISTEM', label: 'Sistem & Autentikasi' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Tipe Aksi' },
  { value: 'CREATE', label: 'CREATE (Pencatatan Baru)' },
  { value: 'UPDATE', label: 'UPDATE (Modifikasi / Edit)' },
  { value: 'APPROVE', label: 'APPROVE (Persetujuan / Kirim)' },
  { value: 'FINALIZE', label: 'FINALIZE (Finalisasi Opname)' },
  { value: 'CITO', label: 'CITO (Pengambilan Darurat)' },
  { value: 'SHIFT_CLOSE', label: 'SHIFT_CLOSE (Kunci Shift)' },
  { value: 'SHIFT_UNLOCK', label: 'SHIFT_UNLOCK (Buka Kunci Shift)' },
  { value: 'REJECT', label: 'REJECT (Penolakan)' },
  { value: 'DELETE', label: 'DELETE (Penghapusan)' },
  { value: 'CANCEL', label: 'CANCEL (Pembatalan)' },
];

const DETAIL_KEY_LABELS = {
  tanggal: 'Tanggal Operasional',
  shift: 'Shift Operasional',
  items_count: 'Jumlah Bahan Bergerak',
  total_masuk: 'Total Unit Masuk',
  total_keluar: 'Total Unit Keluar',
  rincian_bahan: 'Rincian Pergerakan Bahan',
  kode_opname: 'Kode Dokumen Opname',
  opname_id: 'ID Opname',
  status: 'Status Dokumen',
  total_produk_diaudit: 'Total Bahan Diaudit',
  produk_berselisih: 'Bahan Berselisih Fisik',
  penyesuaian_stok_diterapkan: 'Penyesuaian Stok Fisik',
  defect_id: 'ID Laporan Defect',
  produk: 'Nama Bahan Baku',
  jumlah: 'Kuantitas',
  status_keputusan: 'Keputusan Otorisasi',
  alasan_kerusakan: 'Keterangan / Alasan',
  kode_tiket: 'Nomor Tiket / Surat Jalan',
  cabang_pemohon: 'Cabang Tujuan / Pemohon',
  status_tiket: 'Status Tiket',
  status_baru: 'Status Baru',
  tipe_permintaan: 'Tipe Distribusi',
  jumlah_jenis_barang: 'Jumlah Jenis Bahan',
  total_unit: 'Total Kuantitas Unit',
  jumlah_diminta: 'Jumlah Diminta',
  qty_disetujui: 'Jumlah Disetujui',
  nomor_batch: 'Nomor Batch FEFO',
  tanggal_masuk: 'Tanggal Masuk Batch',
  tanggal_kadaluarsa: 'Tanggal Kadaluarsa',
  catatan: 'Catatan',
  total_in: 'Total Masuk Shift',
  total_out: 'Total Keluar Shift',
  closing_notes: 'Catatan Tutup Shift',
  alasan_unlock: 'Alasan Buka Kunci Shift'
};

const formatDetailValue = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'boolean') return val ? 'Ya (Diterapkan)' : 'Tidak';
  return String(val);
};

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    axiosClient
      .get('/outlets')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        setOutlets(list);
      })
      .catch(() => {});
  }, []);

  // 1. Fetch Stats (mengikuti filter aktif)
  const fetchStats = async (overrideParams = {}) => {
    try {
      const res = await axiosClient.get('/audit/stats', {
        params: {
          outlet_id: ('outlet_id' in overrideParams ? overrideParams.outlet_id : selectedOutlet) || undefined,
          module: ('module' in overrideParams ? overrideParams.module : selectedModule) || undefined,
          action: ('action' in overrideParams ? overrideParams.action : selectedAction) || undefined,
          start_date: ('start_date' in overrideParams ? overrideParams.start_date : startDate) || undefined,
          end_date: ('end_date' in overrideParams ? overrideParams.end_date : endDate) || undefined,
          search: ('search' in overrideParams ? overrideParams.search : search) || undefined
        }
      });
      setStats(res?.data || res || null);
    } catch (e) {
      console.error('Error fetching audit stats', e);
    }
  };

  // 2. Fetch Logs
  const fetchLogs = async (page = 1, overrideParams = {}) => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/audit/logs', {
        params: {
          page,
          limit: pagination.limit,
          outlet_id: ('outlet_id' in overrideParams ? overrideParams.outlet_id : selectedOutlet) || undefined,
          module: ('module' in overrideParams ? overrideParams.module : selectedModule) || undefined,
          action: ('action' in overrideParams ? overrideParams.action : selectedAction) || undefined,
          start_date: ('start_date' in overrideParams ? overrideParams.start_date : startDate) || undefined,
          end_date: ('end_date' in overrideParams ? overrideParams.end_date : endDate) || undefined,
          search: ('search' in overrideParams ? overrideParams.search : search) || undefined
        }
      });
      const logList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (res?.data?.data || []));
      setLogs(logList);
      const pag = res?.pagination || res?.data?.pagination;
      if (pag) {
        setPagination(pag);
      }
    } catch (e) {
      toast.error('Gagal mengambil audit trail: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs(1);
  }, [selectedOutlet, selectedModule, selectedAction, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStats();
    fetchLogs(1);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedOutlet('');
    setSelectedModule('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    const cleared = { outlet_id: '', module: '', action: '', start_date: '', end_date: '', search: '' };
    fetchStats(cleared);
    fetchLogs(1, cleared);
  };

  // Helper badge warna aksi
  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
      case 'APPROVE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'FINALIZE':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'UPDATE':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'CITO':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'DELETE':
      case 'CANCEL':
      case 'REJECT':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'SHIFT_CLOSE':
        return 'bg-[#F9610D]/20 text-[#F9610D] border-[#F9610D]/40';
      case 'SHIFT_UNLOCK':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'LOGIN':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-stone-500/15 text-stone-300 border-stone-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 text-white">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="text-[#F9610D]" size={28} />
            Audit Trail & Log Aktivitas Pengguna
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Jejak rekam digital permanen atas setiap perubahan stok, otorisasi transfer, penyesuaian opname, dan buka-kunci shift.
          </p>
        </div>

        <button
          onClick={() => { fetchStats(); fetchLogs(pagination.page); }}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1A1412] hover:bg-white/5 border border-[#2D241E] text-xs font-bold text-stone-300 hover:text-white transition-all shadow-md"
        >
          <RotateCcw size={14} />
          Segarkan Data
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Jejak Audit & Aktivitas Hari Ini */}
        <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Jejak Audit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats?.total_records ?? pagination.total ?? 0}
            </p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              +{stats?.total_today || 0} Hari Ini
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {stats?.shift_close_count || 0} tutup buku shift terekam
          </p>
        </div>

        {/* 2. Aksi Kritis & Otorisasi Khusus */}
        <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Aksi Kritis & Otorisasi</span>
            <div className="w-7 h-7 rounded-lg bg-[#EC1F27]/10 border border-[#EC1F27]/20 flex items-center justify-center text-[#EC1F27]">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold mt-3 ${(stats?.critical_actions || 0) > 0 ? 'text-[#EC1F27]' : 'text-stone-300'}`}>
            {stats?.critical_actions || 0} Aksi
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Unlock Shift, Cito, Finalize, Reject / Hapus
          </p>
        </div>

        {/* 3. Koreksi Stok & Insiden (Menggantikan Modul Teraktif) */}
        <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Koreksi Stok & Insiden</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFCE00]/10 border border-[#FFCE00]/20 flex items-center justify-center text-[#FFCE00]">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#FFCE00] mt-3">
            {stats?.stock_adjustments || 0} Kejadian
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            {stats?.opname_count || 0} Stok Opname • {stats?.defect_count || 0} Defect & FEFO
          </p>
        </div>

        {/* 4. Staf & Cabang Terlibat */}
        <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Staf & Unit Terlibat</span>
            <div className="w-7 h-7 rounded-lg bg-[#F9610D]/10 border border-[#F9610D]/20 flex items-center justify-center text-[#F9610D]">
              <User size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#F9610D] mt-3">
            {stats?.active_users || 0} Akun
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Beraktivitas pada {stats?.active_outlets || 0} cabang / unit
          </p>
        </div>
      </div>

      {/* ── FILTER & SEARCH PANEL ── */}
      <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staf, kode tiket/opname, atau deskripsi..."
              className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#F9610D]"
            />
          </div>

          {/* Cabang / Outlet */}
          <div>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#F9610D]"
            >
              <option value="">Semua Cabang / Unit</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Modul */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#F9610D]"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Aksi */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#F9610D]"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Search & Reset */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#F9610D] hover:bg-[#d9530a] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Cari
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2.5 bg-[#120E0C] hover:bg-white/5 border border-[#2D241E] text-stone-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#241C18] text-xs text-stone-400">
          <span className="font-semibold text-stone-300 flex items-center gap-1.5">
            <Calendar size={13} className="text-[#FFCE00]" /> Rentang Tanggal:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#120E0C] border border-[#2D241E] rounded-lg px-2.5 py-1 text-xs text-white"
            />
            <span>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#120E0C] border border-[#2D241E] rounded-lg px-2.5 py-1 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* ── LOGS TABLE ── */}
      <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#241C18]">
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <FileText size={18} className="text-[#F9610D]" />
            Daftar Jejak Audit ({pagination.total} Rekaman)
          </h2>
          <span className="text-xs text-stone-400">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2D241E] border-t-[#F9610D]" />
            <span className="text-xs font-medium text-stone-400">Memuat rekaman log aktivitas...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-xs sm:text-sm">
            Tidak ada rekaman log aktivitas yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Waktu & Tanggal</th>
                  <th className="py-3 px-3">Pengguna & Role</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3 text-center">Modul</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                  <th className="py-3 px-3">Deskripsi Aktivitas</th>
                  <th className="py-3 px-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241C18]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-white text-xs">
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-[#FFCE00]" />
                        {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* User & Role */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#F9610D]/20 text-[#F9610D] flex items-center justify-center text-[10px] font-black">
                          {log.user_name?.charAt(0) || 'U'}
                        </div>
                        {log.user_name || 'Sistem'}
                      </div>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase">
                        {log.role || 'SYSTEM'}
                      </span>
                    </td>

                    {/* Cabang */}
                    <td className="py-3.5 px-3 text-stone-300 text-xs">
                      {log.outlet_name || 'Semua Cabang'}
                    </td>

                    {/* Modul */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#120E0C] border border-[#2D241E] text-[10px] font-bold text-stone-300 uppercase">
                        {log.module}
                      </span>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Deskripsi */}
                    <td className="py-3.5 px-3 text-stone-300 text-xs max-w-md leading-relaxed">
                      {log.description}
                    </td>

                    {/* Detail Payload Modal Button */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setShowRawJson(false);
                          setSelectedLog(log);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-[#2D241E] text-stone-300 hover:text-white text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Lihat Rincian Audit"
                      >
                        <Eye size={12} />
                        Rincian
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION ── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#241C18]">
            <span className="text-xs text-stone-400">
              Menampilkan {logs.length} dari {pagination.total} baris
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-2 rounded-xl bg-[#120E0C] border border-[#2D241E] text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-[#120E0C] border border-[#2D241E] rounded-xl text-xs font-bold text-white">
                {pagination.page}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-2 rounded-xl bg-[#120E0C] border border-[#2D241E] text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DETAIL RINCIAN AUDIT ── */}
      {selectedLog && (() => {
        let parsedDetails = null;
        try {
          parsedDetails = typeof selectedLog.details === 'string'
            ? JSON.parse(selectedLog.details)
            : selectedLog.details;
        } catch {
          parsedDetails = null;
        }
        const detailEntries = parsedDetails && typeof parsedDetails === 'object'
          ? Object.entries(parsedDetails)
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#241C18]">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[#F9610D]" />
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Dokumen Rincian Audit #{selectedLog.id}
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      {new Date(selectedLog.created_at).toLocaleString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Kartu Identitas Aktivitas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#120E0C] border border-[#2D241E]">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Pelaku & Otoritas</span>
                  <span className="font-bold text-white block mt-0.5">{selectedLog.user_name || 'Sistem'}</span>
                  <span className="text-[10px] text-[#F9610D] font-bold">{selectedLog.role || 'SYSTEM'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#120E0C] border border-[#2D241E]">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Lokasi / Unit</span>
                  <span className="font-bold text-white block mt-0.5">{selectedLog.outlet_name || 'Pusat / Konsolidasi'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#120E0C] border border-[#2D241E]">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Modul & Aksi</span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-stone-200 font-bold text-[10px]">
                      {selectedLog.module}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadge(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ringkasan Aktivitas */}
              <div className="p-3.5 rounded-2xl bg-[#120E0C] border border-[#2D241E] text-xs">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block mb-1">
                  Ringkasan Aktivitas Tercatat
                </span>
                <p className="text-stone-200 leading-relaxed font-medium">
                  {selectedLog.description}
                </p>
              </div>

              {/* Tabel Rincian Parameter Terformat */}
              {detailEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-300">
                      Rincian Parameter Transaksi
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-[11px] font-semibold text-[#F9610D] hover:underline cursor-pointer"
                    >
                      {showRawJson ? 'Tampilkan Format Tabel' : 'Lihat Raw JSON Teknis'}
                    </button>
                  </div>

                  {!showRawJson ? (
                    <div className="rounded-2xl bg-[#120E0C] border border-[#2D241E] divide-y divide-[#241C18] overflow-hidden text-xs">
                      {detailEntries.map(([key, val]) => {
                        const label = DETAIL_KEY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        if (Array.isArray(val)) {
                          return (
                            <div key={key} className="p-3 space-y-1.5">
                              <span className="text-stone-400 font-semibold block">{label} ({val.length}):</span>
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                                {val.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 rounded-lg bg-[#1A1412] border border-[#2D241E] text-[11px] text-stone-200 font-medium"
                                  >
                                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={key} className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                            <span className="text-stone-400">{label}</span>
                            <span className="font-bold text-white text-right">
                              {formatDetailValue(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <pre className="p-4 rounded-2xl bg-[#0E0B0A] border border-[#2D241E] text-xs font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed">
                      {JSON.stringify(parsedDetails, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#F9610D] hover:bg-[#d9530a] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AuditTrail;
