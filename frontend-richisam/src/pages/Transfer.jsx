import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Send, AlertCircle, RefreshCw, Radar, XCircle, Trash2, Printer, History, FileText, CheckCircle2, Clock, Check, X, ShieldAlert, Filter, AlertTriangle, Eye } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import SuratJalanModal from '../components/SuratJalanModal';
import Pagination from '../components/Pagination';

const Transfer = () => {
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' | 'riwayat'
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // Filter for Riwayat Transfer ('ALL', 'PENDING', 'APPROVED', 'REJECTED')
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination for Riwayat Transfer
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const pageSize = 15;
  
  const [fromOutlet, setFromOutlet] = useState('');
  const [toOutlet, setToOutlet] = useState('');
  const [transferItems, setTransferItems] = useState([{ product_id: '', qty: '' }]);
  const [catatan, setCatatan] = useState('');
  const [password, setPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  // Rejection Modal State
  const [rejectModal, setRejectModal] = useState({ isOpen: false, kode_transfer: '', reason: '' });

  // Approve Modal State
  const [approveModal, setApproveModal] = useState({ isOpen: false, transfer: null });

  // Detail Modal State
  const [detailModal, setDetailModal] = useState({ isOpen: false, transfer: null });

  // Radar State
  const [activeRadar, setActiveRadar] = useState(null); // { index, product_id }
  const [radarData, setRadarData] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);

  // Surat Jalan State
  const [isSuratJalanOpen, setIsSuratJalanOpen] = useState(false);
  const [selectedSuratJalan, setSelectedSuratJalan] = useState(null);

  const canApprove = user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER' || user?.role === 'ADMIN_GUDANG';
  const isBranchStaff = user?.role === 'STAF_CABANG';

  useEffect(() => {
    fetchData();
    fetchTransfers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resOutlets, resProducts] = await Promise.all([
        axiosClient.get('/outlets'),
        axiosClient.get('/products?limit=1000')
      ]);
      
      const outletsData = resOutlets?.data?.data || resOutlets?.data || [];
      setOutlets(outletsData);
      setProducts(resProducts?.data?.data || resProducts?.data || []);
      
      // Auto set fromOutlet if user is branch staff
      if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
        setFromOutlet(user.outlet_id.toString());
      }
    } catch {
      toast.error('Gagal memuat data master');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const res = await axiosClient.get('/transfers');
      setTransfers(res?.data?.data || res?.data || []);
    } catch {
      console.error('Gagal mengambil riwayat transfer');
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleAddItem = () => {
    setTransferItems([...transferItems, { product_id: '', qty: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...transferItems];
    newItems.splice(index, 1);
    setTransferItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...transferItems];
    newItems[index][field] = value;
    setTransferItems(newItems);
  };

  const handleOpenRadar = async (index, product_id) => {
    if (!product_id) return;
    setActiveRadar({ index, product_id });
    setRadarLoading(true);
    try {
      const res = await axiosClient.get(`/stocks/radar/${product_id}`);
      setRadarData(res.data || []);
    } catch {
      toast.error('Gagal mengambil data radar stok');
    } finally {
      setRadarLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromOutlet || !toOutlet) {
      toast.error('Pilih Cabang Asal dan Tujuan');
      return;
    }
    if (fromOutlet === toOutlet) {
      toast.error('Cabang Asal dan Tujuan tidak boleh sama');
      return;
    }
    if (!password) {
      toast.error('Password otorisasi wajib diisi');
      return;
    }

    // Filter valid items
    const validItems = transferItems.filter(item => item.product_id && item.qty > 0);
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal satu produk dengan jumlah > 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        from_outlet_id: parseInt(fromOutlet),
        to_outlet_id: parseInt(toOutlet),
        catatan,
        password,
        items: validItems.map(item => ({
          product_id: parseInt(item.product_id),
          qty: parseInt(item.qty)
        }))
      };

      const res = await axiosClient.post('/transfers', payload);
      
      const fromObj = outlets.find(o => o.id === parseInt(fromOutlet));
      const toObj = outlets.find(o => o.id === parseInt(toOutlet));

      if (isBranchStaff) {
        toast.success(res.data?.message || 'Pengajuan transfer berhasil dikirim! Menunggu persetujuan Admin Pusat.');
        // Switch to history tab to view pending request
        setActiveTab('riwayat');
      } else {
        toast.success('Transfer berhasil dieksekusi langsung! Surat Jalan siap dicetak.');
        
        // Prepare data for immediate printing for Admin
        const suratData = {
          kode_transfer: res?.data?.data?.kode_transfer || `SJ-TRF-${Date.now()}`,
          created_at: new Date().toISOString(),
          from_outlet_name: fromObj?.nama || 'Cabang Asal',
          from_outlet_address: fromObj?.alamat || '',
          to_outlet_name: toObj?.nama || 'Cabang Tujuan',
          to_outlet_address: toObj?.alamat || '',
          creator_name: user?.nama || 'Admin/Staf',
          catatan,
          items: validItems.map(item => {
            const p = products.find(prod => prod.id === parseInt(item.product_id));
            return {
              product_kode: p?.kode || 'PRD',
              product_name: p?.nama || 'Produk',
              product_satuan: p?.satuan || 'pcs',
              qty: parseInt(item.qty)
            };
          })
        };

        setSelectedSuratJalan(suratData);
        setIsSuratJalanOpen(true);
      }

      // Reset Form
      setTransferItems([{ product_id: '', qty: '' }]);
      setCatatan('');
      setPassword('');
      if (user?.role !== 'STAF_CABANG') {
        setFromOutlet('');
      }
      setToOutlet('');
      fetchTransfers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses transfer cabang');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApprove = (trf) => {
    setApproveModal({ isOpen: true, transfer: trf });
  };

  const handleExecuteApprove = async () => {
    if (!approveModal.transfer) return;
    const kode_transfer = approveModal.transfer.kode_transfer;
    
    setActionLoading(true);
    try {
      const res = await axiosClient.put(`/transfers/${kode_transfer}/approve`);
      toast.success(res.data?.message || 'Transfer berhasil disetujui & stok telah dialokasikan!');
      setApproveModal({ isOpen: false, transfer: null });
      fetchTransfers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyetujui transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectModal.kode_transfer) return;
    if (!rejectModal.reason || rejectModal.reason.trim() === '') {
      return toast.error('Harap isi alasan penolakan transfer');
    }

    setActionLoading(true);
    try {
      const res = await axiosClient.put(`/transfers/${rejectModal.kode_transfer}/reject`, {
        rejection_reason: rejectModal.reason
      });
      toast.success(res.data?.message || 'Permohonan transfer telah ditolak');
      setRejectModal({ isOpen: false, kode_transfer: '', reason: '' });
      fetchTransfers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menolak transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintTransfer = (trf) => {
    setSelectedSuratJalan(trf);
    setIsSuratJalanOpen(true);
  };

  // Filter transfers based on statusFilter
  const filteredTransfers = transfers.filter(trf => {
    const st = trf.status || 'APPROVED';
    if (statusFilter === 'ALL') return true;
    return st === statusFilter;
  });

  const pendingCount = transfers.filter(t => (t.status || 'APPROVED') === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F9610D]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-3">
            <Send className="w-7 h-7 text-[#F9610D]" />
            Transfer Antar Cabang
          </h1>
          <p className="text-muted mt-1 text-sm">
            {isBranchStaff 
              ? 'Pantau stok lintas cabang dengan Radar & ajukan permohonan transfer untuk diotorisasi Admin' 
              : 'Otorisasi permohonan transfer cabang, mutasi stok fisik, & cetak Surat Jalan resmi'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-cream/70 p-1.5 rounded-2xl border border-line">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-[#F9610D] text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isBranchStaff ? 'Ajukan Transfer' : 'Kirim Transfer'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('riwayat'); fetchTransfers(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'riwayat'
                ? 'bg-[#F9610D] text-white shadow-xs transfer-tab-active'
                : 'text-muted hover:text-ink'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat & Otorisasi</span>
            {pendingCount > 0 && (
              <span
                style={{ backgroundColor: '#FFFFFF', color: '#000000', fontWeight: 900 }}
                className="px-2.5 py-0.5 text-[10px] rounded-full shadow-xs border border-black/10 transfer-pending-badge ml-1 inline-block"
              >
                {pendingCount} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'transfer' ? (
        <div className="bg-white rounded-3xl shadow-xs border border-line p-6 sm:p-8 space-y-6">
          
          {/* Kebijakan Otorisasi Alert Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="block text-amber-950 font-bold mb-0.5">
                Kebijakan Otorisasi Terpusat (Admin Control)
              </strong>
              {isBranchStaff ? (
                <span>
                  Sesuai SOP, cabang <strong>tidak dapat memindahkan produk secara langsung</strong> tanpa persetujuan pusat. 
                  Anda dapat menggunakan tombol <strong>Radar</strong> di samping produk untuk memantau stok cabang lain, 
                  lalu kirim formulir ini. Permohonan Anda akan ditinjau & disetujui terlebih dahulu oleh Admin sebelum stok dialokasikan.
                </span>
              ) : (
                <span>
                  Sebagai Admin, Anda dapat memantau ketersediaan stok melalui Radar dan mengeksekusi transfer antar cabang dengan pencatatan mutasi stok otomatis dan Surat Jalan resmi.
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Outlet */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-ink mb-2">
                  Cabang Asal (Pengirim)
                </label>
                <select
                  value={fromOutlet}
                  onChange={(e) => setFromOutlet(e.target.value)}
                  disabled={user?.role === 'STAF_CABANG'}
                  className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] disabled:opacity-60"
                >
                  <option value="">Pilih Cabang Asal</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>

              {/* To Outlet */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-ink mb-2">
                  Cabang Tujuan (Penerima)
                </label>
                <select
                  value={toOutlet}
                  onChange={(e) => setToOutlet(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D]"
                >
                  <option value="">Pilih Cabang Tujuan</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-ink">Item Produk Yang Akan Ditransfer</h3>
                <span className="text-xs text-muted">
                  💡 Klik ikon <strong>Radar</strong> untuk cek stok cabang lain secara langsung
                </span>
              </div>
              
              <div className="space-y-4">
                {transferItems.map((item, index) => (
                  <div key={index} className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                      <div className="flex-1 w-full">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D]"
                        >
                          <option value="">Pilih Produk...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.nama} ({p.satuan})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full md:w-48">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D]"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenRadar(index, item.product_id)}
                          disabled={!item.product_id}
                          className="text-[#F9610D] bg-[#F9610D]/10 hover:bg-[#F9610D] hover:text-white font-bold p-3 rounded-xl border border-[#F9610D]/30 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-xs"
                          title="Cek Ketersediaan Stok Lintas Cabang (Radar Stok)"
                        >
                          <Radar className="w-5 h-5" />
                          <span className="hidden sm:inline text-xs font-bold">Radar</span>
                        </button>
                        {transferItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-600 hover:bg-rose-600 hover:text-white font-medium p-3 bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-xs"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Visual Radar Popup/Container */}
                    {activeRadar?.index === index && (
                      <div className="w-full mt-2 p-4 sm:p-5 bg-cream/50 border border-line rounded-2xl animate-fade-in relative overflow-hidden shadow-xs">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                            <Radar className="w-4 h-4 text-[#F9610D]" /> Radar Ketersediaan Stok Lintas Cabang
                          </h4>
                          <button
                            type="button"
                            onClick={() => setActiveRadar(null)}
                            className="text-muted hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {radarLoading ? (
                          <div className="flex justify-center py-4">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#F9610D]" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {radarData.length > 0 ? radarData.map(r => {
                              const isSafe = r.qty_current > r.min_qty;
                              return (
                                <div
                                  key={r.outlet_id}
                                  className={`p-3.5 rounded-xl border ${
                                    isSafe
                                      ? 'bg-emerald-50 border-emerald-200'
                                      : 'bg-rose-50 border-rose-200'
                                  } flex justify-between items-center shadow-xs`}
                                >
                                  <div>
                                    <div className="font-bold text-sm text-ink">{r.outlet_name}</div>
                                    <div className="text-xs text-muted">Batas Aman: {r.min_qty}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-black text-lg ${isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {r.qty_current}
                                    </div>
                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {isSafe ? 'Aman' : 'Kritis'}
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="col-span-full text-center text-xs text-muted py-3">
                                Tidak ada data stok untuk produk ini.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 text-xs font-bold text-[#F9610D] hover:underline cursor-pointer flex items-center gap-1.5"
              >
                + Tambah Item Produk
              </button>
            </div>

            {/* Catatan Pengiriman */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-ink mb-2">
                Catatan / Alasan Transfer
              </label>
              <input
                type="text"
                placeholder="Contoh: Stok menipis karena lonjakan order weekend, driver ojol tiba jam 11..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] placeholder:text-muted"
              />
            </div>

            {/* Otorisasi Transfer dengan PIN/Password */}
            <div className="border-t border-line pt-6 bg-cream/40 -mx-6 sm:-mx-8 px-6 sm:px-8 pb-6 rounded-b-3xl">
              <div className="flex items-start gap-3 mb-4 mt-2">
                <AlertCircle className="w-5 h-5 text-[#F9610D] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold mb-1 text-ink">Konfirmasi Keamanan & Identitas Pengirim</p>
                  <p className="text-muted">
                    {isBranchStaff 
                      ? 'Masukkan PIN / Password akun Anda untuk menandatangani pengajuan transfer resmi:' 
                      : 'Masukkan PIN / Password akun Anda untuk memvalidasi pemindahan stok & penerbitan Surat Jalan:'}
                  </p>
                </div>
              </div>
              
              <div className="max-w-sm">
                <input
                  type="password"
                  placeholder="Masukkan PIN / Password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-line text-ink rounded-xl focus:outline-none focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] text-sm placeholder:text-muted"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 bg-[#F9610D] hover:bg-[#E0560C] text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>
                  {isBranchStaff 
                    ? 'Kirim Pengajuan Transfer (Menunggu Otorisasi Admin)' 
                    : 'Eksekusi Transfer & Terbitkan Surat Jalan'}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Tab Riwayat Transfer & Otorisasi Admin */
        <div className="bg-white rounded-3xl shadow-xs border border-line overflow-hidden">
          <div className="p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/30">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#F9610D]" />
                Riwayat Pengajuan & Arsip Surat Jalan
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {canApprove 
                  ? 'Review pengajuan transfer yang masuk dari cabang, setujui/tolak, dan cetak Surat Jalan' 
                  : 'Pantau status permohonan transfer cabang Anda'}
              </p>
            </div>

            {/* Filter Status Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentHistoryPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#F9610D] text-white shadow-xs'
                      : 'bg-white hover:bg-cream text-muted hover:text-ink border border-line'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st === 'PENDING' ? 'Pending' : st === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                </button>
              ))}
              <button
                onClick={fetchTransfers}
                className="p-2 text-muted hover:text-ink bg-white hover:bg-cream border border-line rounded-xl transition-all cursor-pointer ml-1"
                title="Refresh Riwayat"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTransfers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingTransfers ? (
              <div className="py-16 text-center text-muted">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-2" />
                Memuat riwayat transfer...
              </div>
            ) : filteredTransfers.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-cream/60 text-muted font-bold text-xs uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="px-6 py-4">No. Surat Jalan / Kode</th>
                    <th className="px-6 py-4">Tanggal & Jam</th>
                    <th className="px-6 py-4">Dari (Asal)</th>
                    <th className="px-6 py-4">Ke (Tujuan)</th>
                    <th className="px-6 py-4 text-center">Jumlah Item</th>
                    <th className="px-6 py-4 text-center">Status Otorisasi</th>
                    <th className="px-6 py-4">Pemohon</th>
                    <th className="px-6 py-4 text-right">Aksi & Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredTransfers.slice((currentHistoryPage - 1) * pageSize, currentHistoryPage * pageSize).map((trf, idx) => {
                    const status = trf.status || 'APPROVED';
                    const isPending = status === 'PENDING';
                    const isApproved = status === 'APPROVED';
                    const isRejected = status === 'REJECTED';

                    return (
                      <tr key={idx} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-ink">
                          {trf.kode_transfer}
                        </td>
                        <td className="px-6 py-4 text-muted text-xs">
                          {new Date(trf.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 font-medium text-ink">
                          {trf.from_outlet_name}
                        </td>
                        <td className="px-6 py-4 font-medium text-emerald-700">
                          {trf.to_outlet_name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cream text-ink border border-line">
                            {trf.items?.length || 1} Bahan
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-transfer-pending shadow-xs">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Admin
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-transfer-approved shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-transfer-rejected shadow-xs" title={trf.rejection_reason}>
                              <XCircle className="w-3.5 h-3.5" /> Ditolak
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted">
                          <div className="font-semibold text-ink">{trf.creator_name || '-'}</div>
                          {trf.approver_name && (
                            <div className="text-[11px] text-muted font-mono mt-0.5">Acc: {trf.approver_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ isOpen: true, transfer: trf })}
                              title="Lihat Rincian Barang"
                              className="px-2.5 py-1.5 btn-transfer-detail rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Rincian</span>
                            </button>

                            {isPending ? (
                              canApprove ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenApprove(trf)}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 btn-transfer-approve rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Setujui</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectModal({ isOpen: true, kode_transfer: trf.kode_transfer, reason: '' })}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 btn-transfer-reject rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-amber-700 font-semibold italic">Menunggu Review Pusat</span>
                              )
                            ) : isApproved ? (
                              <button
                                type="button"
                                onClick={() => handlePrintTransfer(trf)}
                                className="flex items-center gap-1.5 px-3 py-1.5 btn-transfer-print rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak Surat Jalan</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted italic block">
                                {trf.rejection_reason || 'Ditolak Admin'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-muted">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-muted" />
                Tidak ada data transfer pada kategori ini.
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentHistoryPage}
            totalCount={filteredTransfers.length}
            pageSize={pageSize}
            onPageChange={setCurrentHistoryPage}
          />
        </div>
      )}

      {/* Modal Dialog Persetujuan Transfer & Pengecekan Stok */}
      {approveModal.isOpen && approveModal.transfer && (() => {
        const trf = approveModal.transfer;
        const isStockShortage = trf.items?.some(item => (item.from_stock ?? 0) < item.qty);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-line rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 text-ink">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-bold text-ink text-base flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600 w-5 h-5" />
                    Otorisasi Transfer Antar-Cabang
                  </h3>
                  <div className="text-xs text-[#F9610D] font-mono font-bold mt-0.5">{trf.kode_transfer}</div>
                </div>
                <button 
                  onClick={() => setApproveModal({ isOpen: false, transfer: null })}
                  className="text-muted hover:text-ink p-1 rounded-lg hover:bg-cream"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Rute & Pemohon */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-cream/50 border border-line rounded-2xl text-xs">
                <div>
                  <div className="text-muted text-[11px]">Cabang Pengirim (Asal)</div>
                  <div className="text-ink font-bold">{trf.from_outlet_name}</div>
                </div>
                <div>
                  <div className="text-muted text-[11px]">Cabang Penerima (Tujuan)</div>
                  <div className="text-emerald-700 font-bold">{trf.to_outlet_name}</div>
                </div>
                <div className="mt-1">
                  <div className="text-muted text-[11px]">Diajukan Oleh</div>
                  <div className="text-ink font-medium">{trf.creator_name || '-'}</div>
                </div>
                <div className="mt-1">
                  <div className="text-muted text-[11px]">Catatan</div>
                  <div className="text-ink italic">{trf.catatan || '-'}</div>
                </div>
              </div>

              {/* Tabel Item & Ketersediaan Stok */}
              <div>
                <div className="text-xs font-semibold text-ink mb-2">Rincian Barang & Ketersediaan Stok:</div>
                <div className="max-h-52 overflow-y-auto rounded-2xl border border-line divide-y divide-line">
                  {trf.items?.map((item, i) => {
                    const readyStock = item.from_stock ?? 0;
                    const isEnough = readyStock >= item.qty;
                    return (
                      <div key={i} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-ink">{item.product_name}</div>
                          <div className="text-muted text-[11px] font-mono">{item.product_kode}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#F9610D]">
                            Diminta: {item.qty} {item.product_satuan}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {isEnough ? (
                              <span className="text-emerald-700 font-bold">
                                ✓ Stok Ready: {readyStock} {item.product_satuan}
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold">
                                ⚠️ Stok Asal Kurang ({readyStock} dari {item.qty})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Alert */}
              {isStockShortage ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-950">Stok Cabang Asal Tidak Mencukupi!</div>
                    <div className="text-rose-800 mt-0.5 leading-relaxed">
                      Stok di <strong>{trf.from_outlet_name}</strong> tidak memenuhi jumlah yang diminta. Anda dapat menolak permintaan ini agar cabang memesan langsung ke Central Kitchen.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-950">Stok Cabang Asal Mencukupi</div>
                    <div className="text-emerald-800 mt-0.5 leading-relaxed">
                      Menyetujui akan langsung memotong stok di <strong>{trf.from_outlet_name}</strong> dan menambahkannya ke <strong>{trf.to_outlet_name}</strong>, serta mengaktifkan Cetak Surat Jalan resmi.
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const kode = trf.kode_transfer;
                    setApproveModal({ isOpen: false, transfer: null });
                    setRejectModal({ isOpen: true, kode_transfer: kode, reason: 'Stok cabang asal tidak mencukupi untuk memenuhi transfer.' });
                  }}
                  className="px-3.5 py-2 btn-transfer-reject rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Tolak Pengajuan
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApproveModal({ isOpen: false, transfer: null })}
                    className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || isStockShortage}
                    onClick={handleExecuteApprove}
                    className="px-4 py-2 btn-transfer-approve disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    {actionLoading ? 'Memproses...' : (
                      <>
                        <Check size={16} />
                        <span>Ya, Setujui & Alokasikan Stok</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Dialog Rincian Transfer */}
      {detailModal.isOpen && detailModal.transfer && (() => {
        const trf = detailModal.transfer;
        const isPending = (trf.status || 'APPROVED') === 'PENDING';
        const isApproved = (trf.status || 'APPROVED') === 'APPROVED';

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-line rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 text-ink">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-bold text-ink text-base flex items-center gap-2">
                    <FileText className="text-[#F9610D] w-5 h-5" />
                    Rincian Tiket Transfer Antar-Cabang
                  </h3>
                  <div className="text-xs text-[#F9610D] font-mono font-bold mt-0.5">{trf.kode_transfer}</div>
                </div>
                <button 
                  onClick={() => setDetailModal({ isOpen: false, transfer: null })}
                  className="text-muted hover:text-ink p-1 rounded-lg hover:bg-cream"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Badge & Header Info */}
              <div className="flex items-center justify-between p-3.5 bg-cream/50 border border-line rounded-2xl text-xs">
                <div>
                  <div className="text-muted text-[11px]">Waktu Pengajuan</div>
                  <div className="text-ink font-semibold">
                    {new Date(trf.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted text-[11px] mb-0.5">Status Tiket</div>
                  {isPending ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-700" /> Menunggu Admin
                    </span>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Disetujui
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <XCircle className="w-3.5 h-3.5 text-rose-700" /> Ditolak
                    </span>
                  )}
                </div>
              </div>

              {/* Rute & Pemohon */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-cream/50 border border-line rounded-2xl text-xs">
                <div>
                  <div className="text-muted text-[11px]">Cabang Pengirim (Asal)</div>
                  <div className="text-ink font-bold">{trf.from_outlet_name}</div>
                </div>
                <div>
                  <div className="text-muted text-[11px]">Cabang Penerima (Tujuan)</div>
                  <div className="text-emerald-700 font-bold">{trf.to_outlet_name}</div>
                </div>
                <div className="mt-1">
                  <div className="text-muted text-[11px]">Diajukan Oleh</div>
                  <div className="text-ink font-medium">{trf.creator_name || '-'}</div>
                </div>
                <div className="mt-1">
                  <div className="text-muted text-[11px]">Disetujui Oleh</div>
                  <div className="text-ink font-medium">{trf.approver_name ? `${trf.approver_name}` : '-'}</div>
                </div>
              </div>

              {/* Catatan / Alasan Penolakan */}
              {trf.rejection_reason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900">
                  <div className="font-bold text-rose-950 mb-0.5">Alasan Penolakan:</div>
                  <div className="text-rose-800">{trf.rejection_reason}</div>
                </div>
              )}

              {/* Tabel Item */}
              <div>
                <div className="text-xs font-semibold text-ink mb-2">Daftar Bahan / Produk:</div>
                <div className="max-h-52 overflow-y-auto rounded-2xl border border-line divide-y divide-line">
                  {trf.items?.map((item, i) => (
                    <div key={i} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-ink">{item.product_name}</div>
                        <div className="text-muted text-[11px] font-mono">{item.product_kode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#F9610D]">
                          {item.qty} {item.product_satuan}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModal({ isOpen: false, transfer: null });
                        handlePrintTransfer(trf);
                      }}
                      className="px-3.5 py-2 btn-transfer-print rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer size={15} />
                      <span>Cetak Surat Jalan</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailModal({ isOpen: false, transfer: null })}
                    className="px-4 py-2 bg-cream hover:bg-sand border border-line text-ink text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>

                  {isPending && canApprove && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModal({ isOpen: false, transfer: null });
                        handleOpenApprove(trf);
                      }}
                      className="px-4 py-2 btn-transfer-approve font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={16} />
                      <span>Review & Setujui</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Dialog Penolakan Transfer */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-line rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-ink">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <AlertTriangle className="text-rose-600 w-5 h-5" />
                Tolak Pengajuan Transfer
              </h3>
              <button 
                onClick={() => setRejectModal({ isOpen: false, kode_transfer: '', reason: '' })}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-cream"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted">
              Pengajuan <strong>{rejectModal.kode_transfer}</strong> akan dibatalkan dan stok kedua cabang tidak akan berpindah. Silakan masukkan alasan penolakan:
            </p>
            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Contoh: Stok cabang asal tidak mencukupi untuk jam operasional malam, silakan ambil dari Central Kitchen..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-ink text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-muted"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, kode_transfer: '', reason: '' })}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 btn-transfer-reject font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surat Jalan Printable Modal */}
      <SuratJalanModal
        isOpen={isSuratJalanOpen}
        onClose={() => setIsSuratJalanOpen(false)}
        data={selectedSuratJalan}
      />
    </div>
  );
};

export default Transfer;
