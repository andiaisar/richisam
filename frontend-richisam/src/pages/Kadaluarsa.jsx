import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  CalendarClock, AlertTriangle, AlertCircle, CheckCircle2, Plus, 
  Search, RefreshCw, Trash2, Filter, ShieldAlert, Sparkles, X, ChevronRight, Store
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Kadaluarsa = () => {
  const { user } = useAuthStore();
  
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    outlet_id: '',
    batch_no: '',
    qty: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    expired_date: '',
    catatan: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchSummary();
  }, [selectedOutlet, statusFilter]);

  const fetchInitialData = async () => {
    try {
      const [resOutlets, resProducts] = await Promise.all([
        axiosClient.get('/outlets'),
        axiosClient.get('/products')
      ]);
      setOutlets(resOutlets?.data?.data || resOutlets?.data || []);
      setProducts(resProducts?.data?.data || resProducts?.data || []);
      
      if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
        setSelectedOutlet(user.outlet_id.toString());
        setFormData(prev => ({ ...prev, outlet_id: user.outlet_id.toString() }));
      }
    } catch {
      toast.error('Gagal memuat data referensi');
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      let url = `/batches?status=${statusFilter}`;
      if (selectedOutlet) url += `&outlet_id=${selectedOutlet}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const res = await axiosClient.get(url);
      setBatches(res?.data?.data || res?.data || []);
    } catch {
      toast.error('Gagal mengambil data batch kadaluarsa');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      let url = '/batches/summary';
      if (selectedOutlet) url += `?outlet_id=${selectedOutlet}`;
      const res = await axiosClient.get(url);
      setSummary(res?.data?.data || res?.data || null);
    } catch (e) {
      console.error('Error fetching summary:', e);
    }
  };

  const handleOpenModal = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 5);

    const randomNum = Math.floor(100 + Math.random() * 900);
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');

    setFormData({
      product_id: products[0]?.id || '',
      outlet_id: user?.role === 'STAF_CABANG' ? user.outlet_id.toString() : (selectedOutlet || outlets[0]?.id || ''),
      batch_no: `BCH-${dateStr}-${randomNum}`,
      qty: '10',
      tanggal_masuk: today.toISOString().split('T')[0],
      expired_date: nextWeek.toISOString().split('T')[0],
      catatan: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.batch_no || !formData.qty || !formData.expired_date) {
      return toast.error('Harap lengkapi semua kolom wajib');
    }

    setSubmitting(true);
    try {
      await axiosClient.post('/batches', formData);
      toast.success('Pencatatan batch kadaluarsa berhasil disimpan!');
      setIsModalOpen(false);
      fetchBatches();
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tandai batch ini telah habis terpakai atau hapus dari daftar?')) return;
    try {
      await axiosClient.delete(`/batches/${id}`);
      toast.success('Batch berhasil diperbarui / dihapus');
      fetchBatches();
      fetchSummary();
    } catch (e) {
      toast.error('Gagal menghapus batch');
    }
  };

  const metrics = summary?.metrics || {
    total_batches: 0,
    total_expired: 0,
    total_critical: 0,
    total_warning: 0,
    total_safe: 0
  };

  const filteredBatches = batches.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.product_name?.toLowerCase().includes(q) || 
           b.batch_no?.toLowerCase().includes(q) ||
           b.product_kode?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-[#FFCE00]" />
            Masa Kadaluarsa & Batch Tracking
          </h1>
          <p className="text-stone-400 mt-1 text-sm">
            Pantau umur simpan bahan baku F&B dengan metode FEFO (First Expired, First Out)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchBatches(); fetchSummary(); }}
            className="p-2.5 bg-[#16110F] border border-[#2D241E] hover:border-stone-600 rounded-xl text-stone-300 hover:text-white transition-all cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#F9610D]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Batch Baru</span>
          </button>
        </div>
      </div>

      {/* FEFO Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#1E1714] via-[#241B17] to-[#1E1714] border border-[#3D2D24] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-[#FFCE00]/10 border border-[#FFCE00]/30 flex items-center justify-center text-[#FFCE00] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Protokol Dapur: Sistem FEFO (First Expired First Out)
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Gunakan selalu bahan yang memiliki tanggal kadaluarsa paling dekat untuk mencegah food waste & kerugian modal.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/5 text-xs text-stone-300">
          <span>Prioritas Aktif</span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired */}
        <div className="p-5 rounded-3xl bg-[#1A1412] border border-red-500/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Kadaluarsa</span>
            <span className="p-2 rounded-xl bg-red-950/40 text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-red-500 mt-2">
            {metrics.total_expired}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Batch lewat tanggal (Wajib Afkir)</p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Critical (<= 3 Days) */}
        <div className="p-5 rounded-3xl bg-[#1A1412] border border-amber-500/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Kritis (H ≤ 3 Hari)</span>
            <span className="p-2 rounded-xl bg-amber-950/40 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-amber-400 mt-2">
            {metrics.total_critical}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Segera prioritaskan pemakaian</p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Warning (4 - 7 Days) */}
        <div className="p-5 rounded-3xl bg-[#1A1412] border border-[#F9610D]/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F9610D]">Peringatan (H ≤ 7 Hari)</span>
            <span className="p-2 rounded-xl bg-orange-950/40 text-[#F9610D]">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-white mt-2">
            {metrics.total_warning}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Mendekati batas konsumsi</p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Safe (> 7 Days) */}
        <div className="p-5 rounded-3xl bg-[#1A1412] border border-emerald-500/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Stok Aman (&gt; 7 Hari)</span>
            <span className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2">
            {metrics.total_safe}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Kondisi kesegaran prima</p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1A1412] p-4 sm:p-5 rounded-3xl border border-[#2D241E] flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk / batch..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-[#F9610D]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Outlet Selector (Admin/Owner) */}
          {user?.role !== 'STAF_CABANG' && (
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-stone-400" />
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="px-3 py-2 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-xs focus:outline-none focus:border-[#F9610D]"
              >
                <option value="">Semua Cabang / Gudang</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-xs focus:outline-none focus:border-[#F9610D]"
            >
              <option value="ALL">Semua Status</option>
              <option value="EXPIRED">🔴 Kadaluarsa (Expired)</option>
              <option value="CRITICAL">🟡 Kritis (H ≤ 3)</option>
              <option value="WARNING">🟠 Peringatan (H ≤ 7)</option>
              <option value="SAFE">🟢 Aman (&gt; 7 Hari)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#1A1412] rounded-3xl shadow-xl border border-[#2D241E] overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#140F0D] text-stone-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2D241E]">
              <tr>
                <th className="px-6 py-4">Nomor Batch</th>
                <th className="px-6 py-4">Nama Bahan Baku</th>
                <th className="px-6 py-4">Cabang / Lokasi</th>
                <th className="px-6 py-4 text-center">Jumlah Stok</th>
                <th className="px-6 py-4">Tgl Masuk</th>
                <th className="px-6 py-4">Tgl Kadaluarsa</th>
                <th className="px-6 py-4 text-center">Sisa Waktu</th>
                <th className="px-6 py-4 text-center">Status FEFO</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241B17]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-stone-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-2" />
                    Memuat data batch kadaluarsa...
                  </td>
                </tr>
              ) : filteredBatches.length > 0 ? (
                filteredBatches.map((b) => {
                  const days = parseInt(b.days_remaining);
                  let statusBadge = null;
                  let countdownText = '';

                  if (days < 0) {
                    countdownText = `Lewat ${Math.abs(days)} hari`;
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-red-950/60 border border-red-500/40 text-red-400">
                        EXPIRED (AFKIR)
                      </span>
                    );
                  } else if (days === 0) {
                    countdownText = 'Hari Ini!';
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-red-950/60 border border-red-500/40 text-red-400 animate-pulse">
                        HARI INI
                      </span>
                    );
                  } else if (days <= 3) {
                    countdownText = `${days} hari lagi`;
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-950/60 border border-amber-500/40 text-amber-400">
                        KRITIS (H-{days})
                      </span>
                    );
                  } else if (days <= 7) {
                    countdownText = `${days} hari lagi`;
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-orange-950/60 border border-orange-500/40 text-[#F9610D]">
                        PERINGATAN
                      </span>
                    );
                  } else {
                    countdownText = `${days} hari lagi`;
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                        AMAN
                      </span>
                    );
                  }

                  return (
                    <tr key={b.id} className="hover:bg-[#1E1714] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#FFCE00]">
                        {b.batch_no}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{b.product_name}</div>
                        <div className="text-xs text-stone-500 font-mono">{b.product_kode}</div>
                      </td>
                      <td className="px-6 py-4 text-stone-300 text-xs">
                        {b.outlet_name}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-white text-base">
                        {b.qty} <span className="text-xs font-normal text-stone-400">{b.product_satuan}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-400">
                        {b.tanggal_masuk}
                      </td>
                      <td className="px-6 py-4 font-semibold text-stone-200 text-xs">
                        {b.expired_date}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-xs">
                        <span className={days < 0 ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-stone-300'}>
                          {countdownText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                          title="Hapus / Tandai Habis"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-stone-500">
                    <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Tidak ada batch kadaluarsa yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Batch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1412] rounded-3xl shadow-2xl w-full max-w-lg border border-[#2D241E] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-[#2D241E] bg-[#140F0D]">
              <div className="flex items-center gap-2.5">
                <CalendarClock className="w-5 h-5 text-[#F9610D]" />
                <h3 className="font-bold text-white text-base">Catat Batch & Masa Kadaluarsa</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">Bahan Baku / Produk *</label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                >
                  <option value="">Pilih Produk...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.kode} - {p.nama} ({p.satuan})</option>
                  ))}
                </select>
              </div>

              {/* Outlet (if admin) */}
              {user?.role !== 'STAF_CABANG' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Cabang Penyimpanan *</label>
                  <select
                    required
                    value={formData.outlet_id}
                    onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                  >
                    <option value="">Pilih Cabang...</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batch No & Qty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">No. Batch *</label>
                  <input
                    type="text"
                    required
                    value={formData.batch_no}
                    onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#F9610D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Jumlah Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                  />
                </div>
              </div>

              {/* Tanggal Masuk & Expired Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Tanggal Masuk</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_masuk}
                    onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Tanggal Kadaluarsa *</label>
                  <input
                    type="date"
                    required
                    value={formData.expired_date}
                    onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">Catatan / Lokasi Simpan</label>
                <input
                  type="text"
                  placeholder="Misal: Chiller rak B-2, ayam marinasi shift pagi..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D] placeholder:text-stone-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2D241E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#F9610D] hover:bg-[#d9530a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kadaluarsa;
