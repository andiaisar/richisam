import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  ClipboardCheck, Search, Plus, RefreshCw, FileText, CheckCircle, 
  AlertTriangle, X, Lock, Calculator, TrendingDown, TrendingUp, 
  ArrowLeft, Printer, ShieldAlert, Sparkles, Store, Calendar
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Opname = () => {
  const { user } = useAuthStore();
  
  const [opnames, setOpnames] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedOpname, setSelectedOpname] = useState(null);
  
  // Create state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({ outlet_id: '', tanggal: new Date().toISOString().split('T')[0] });
  const [creating, setCreating] = useState(false);

  // Detail/Edit state
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [applyAdjustment, setApplyAdjustment] = useState(false);
  const [searchTableQuery, setSearchTableQuery] = useState('');

  const fetchOpnames = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/opnames');
      setOpnames(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil daftar opname');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    if (user?.role !== 'STAF_CABANG') {
      try {
        const res = await axiosClient.get('/outlets');
        const list = res?.data?.data || res?.data || [];
        setOutlets(list);
        if (list.length > 0) {
          setCreateData(prev => ({ ...prev, outlet_id: list[0].id }));
        }
      } catch (e) {}
    } else {
      setCreateData(prev => ({ ...prev, outlet_id: user.outlet_id }));
    }
  };

  useEffect(() => {
    fetchOpnames();
    fetchOutlets();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createData.outlet_id) return toast.error('Pilih outlet');
    
    setCreating(true);
    try {
      const res = await axiosClient.post('/opnames', {
        outlet_id: parseInt(createData.outlet_id),
        tanggal: createData.tanggal
      });
      toast.success('Draf Opname berhasil dibuat');
      setIsCreateModalOpen(false);
      fetchOpnames();
      // Auto open detail
      const opnData = res?.data?.data || res?.data;
      if (opnData) {
        openDetail(opnData);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat opname');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (opname) => {
    setSelectedOpname(opname);
    setViewMode('detail');
    setItemsLoading(true);
    try {
      const res = await axiosClient.get(`/opnames/${opname.id}`);
      const payload = res?.data?.data || res?.data || {};
      const stockItems = payload.items || [];
      setSelectedOpname({
        ...opname,
        ...payload
      });
      setItems(stockItems.map(item => ({
        ...item,
        qty_fisik: item.qty_fisik !== null ? item.qty_fisik : item.qty_sistem,
        selisih: (item.qty_fisik !== null ? item.qty_fisik : item.qty_sistem) - item.qty_sistem,
        alasan: item.alasan || ''
      })));
    } catch (e) {
      toast.error('Gagal memuat detail opname');
      setViewMode('list');
    } finally {
      setItemsLoading(false);
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty_fisik') {
          const fisik = value === '' ? 0 : parseInt(value);
          updated.qty_fisik = isNaN(fisik) || fisik < 0 ? 0 : fisik;
          updated.selisih = updated.qty_fisik - updated.qty_sistem;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSaveItems = async () => {
    setSavingItems(true);
    try {
      const payload = {
        items: items.map(i => ({
          product_id: i.product_id,
          qty_fisik: i.qty_fisik,
          alasan: i.alasan
        }))
      };
      await axiosClient.put(`/opnames/${selectedOpname.id}/items`, payload);
      toast.success('Draf perubahan dan alasan selisih berhasil disimpan!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan item');
    } finally {
      setSavingItems(false);
    }
  };

  const handleFinalize = async () => {
    const missingReason = items.some(i => i.selisih !== 0 && (!i.alasan || i.alasan.trim() === ''));
    if (missingReason) {
      return toast.error('Harap isi alasan untuk semua bahan baku yang memiliki selisih fisik.');
    }

    setFinalizing(true);
    try {
      const payloadItems = {
        items: items.map(i => ({
          product_id: i.product_id,
          qty_fisik: i.qty_fisik,
          alasan: i.alasan
        }))
      };
      await axiosClient.put(`/opnames/${selectedOpname.id}/items`, payloadItems);

      await axiosClient.patch(`/opnames/${selectedOpname.id}/finalize`, {
        apply_adjustment: applyAdjustment
      });

      toast.success('Opname berhasil difinalisasi (FINAL)!');
      setShowFinalizeModal(false);
      setViewMode('list');
      fetchOpnames();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyelesaikan opname');
    } finally {
      setFinalizing(false);
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  // Kalkulator Kerugian Realtime
  const itemsWithLoss = items.filter(i => (i.selisih || 0) < 0);
  const itemsWithSurplus = items.filter(i => (i.selisih || 0) > 0);

  const totalLossValue = itemsWithLoss.reduce((sum, i) => sum + (Math.abs(i.selisih || 0) * parseFloat(i.harga_snapshot || 0)), 0);
  const totalSurplusValue = itemsWithSurplus.reduce((sum, i) => sum + ((i.selisih || 0) * parseFloat(i.harga_snapshot || 0)), 0);
  const netDifference = totalSurplusValue - totalLossValue;
  const totalSelisihQty = items.reduce((acc, i) => acc + (i.selisih || 0), 0);

  const topLossItems = [...itemsWithLoss]
    .map(i => ({
      ...i,
      loss_nominal: Math.abs(i.selisih || 0) * parseFloat(i.harga_snapshot || 0)
    }))
    .sort((a, b) => b.loss_nominal - a.loss_nominal)
    .slice(0, 4);

  const filteredItems = items.filter(i => {
    if (!searchTableQuery) return true;
    const q = searchTableQuery.toLowerCase();
    return i.nama?.toLowerCase().includes(q) || i.alasan?.toLowerCase().includes(q);
  });

  // DETAIL MODE
  if (viewMode === 'detail' && selectedOpname) {
    const isFinal = selectedOpname.status === 'FINAL';

    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto text-white pb-10">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button 
              onClick={() => { setViewMode('list'); fetchOpnames(); }} 
              className="text-xs font-semibold text-stone-400 hover:text-white flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Daftar Dokumen</span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <ClipboardCheck className="w-7 h-7 text-[#FFCE00]" />
                <span>Dokumen Opname:</span>
                <span className="font-mono text-[#FFCE00]">{selectedOpname.kode}</span>
              </h1>
              {isFinal ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <Lock size={12} /> FINAL
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-500/40 text-amber-400">
                  DRAFT (DAPAT DIEDIT)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-400 flex items-center gap-2">
              <span>{selectedOpname.outlet_name || 'Outlet'}</span>
              <span>•</span>
              <Calendar size={13} />
              <span>Tanggal: {new Date(selectedOpname.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {selectedOpname.creator_name && (
                <>
                  <span>•</span>
                  <span>Petugas: {selectedOpname.creator_name}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1613] hover:bg-[#251D19] border border-[#2D241E] text-stone-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Cetak ringkasan hasil opname"
            >
              <Printer size={15} />
              <span>Cetak Hasil</span>
            </button>

            {!isFinal && (
              <>
                <button 
                  onClick={handleSaveItems} 
                  disabled={savingItems}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1E1714] border border-[#2D241E] hover:border-stone-500 text-stone-200 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={15} className={savingItems ? 'animate-spin' : ''} />
                  <span>Simpan Draf</span>
                </button>
                <button 
                  onClick={() => setShowFinalizeModal(true)} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#F9610D]/20 cursor-pointer"
                >
                  <CheckCircle size={15} />
                  <span>Finalisasi Opname</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── KALKULATOR KERUGIAN (FOOD WASTE & SHRINKAGE ANALYTICS CARD) ── */}
        <div className="bg-[#1A1412] rounded-3xl border border-[#2D241E] p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-[#241C18]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Kalkulator Kerugian Selisih Fisik (Food Waste & Shrinkage)
                  <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-[10px] font-mono text-red-400 uppercase">
                    Pilar 2
                  </span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Perhitungan valuasi rupiah dari selisih stok fisik vs stok sistem secara realtime
                </p>
              </div>
            </div>
            
            <div className="text-xs text-stone-400 bg-[#130E0C] px-3.5 py-1.5 rounded-xl border border-[#2D241E]">
              Status Evaluasi: <strong className={totalLossValue > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {totalLossValue > 0 ? `${itemsWithLoss.length} Bahan Mengalami Defisit` : 'Seluruh Bahan Klop'}
              </strong>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
            {/* Loss */}
            <div className="p-4 rounded-2xl bg-[#140F0D] border border-red-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <TrendingDown size={14} /> Total Kerugian Fisik (Rugi)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/70 text-red-300 font-bold">
                  {itemsWithLoss.length} Item
                </span>
              </div>
              <div className="text-2xl font-black text-red-500 mt-2">
                {formatRupiah(totalLossValue)}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Estimasi kerugian akibat barang rusak, susut, atau hilang
              </p>
            </div>

            {/* Surplus */}
            <div className="p-4 rounded-2xl bg-[#140F0D] border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp size={14} /> Total Kelebihan Fisik (Surplus)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 font-bold">
                  {itemsWithSurplus.length} Item
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {formatRupiah(totalSurplusValue)}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Kelebihan fisik dari kesalahan pencatatan shift sebelumnya
              </p>
            </div>

            {/* Net Finansial */}
            <div className="p-4 rounded-2xl bg-[#140F0D] border border-[#2D241E]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  Net Dampak Keuangan
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-bold">
                  Selisih: {totalSelisihQty > 0 ? `+${totalSelisihQty}` : totalSelisihQty} Pcs
                </span>
              </div>
              <div className={`text-2xl font-black mt-2 ${netDifference < 0 ? 'text-red-400' : netDifference > 0 ? 'text-emerald-400' : 'text-stone-300'}`}>
                {netDifference < 0 ? `- ${formatRupiah(Math.abs(netDifference))}` : netDifference > 0 ? `+ ${formatRupiah(netDifference)}` : 'Rp 0 (Seimbang)'}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                {netDifference < 0 ? 'Defisit modal bahan baku' : netDifference > 0 ? 'Surplus netto persediaan' : 'Tidak ada selisih nilai'}
              </p>
            </div>
          </div>

          {/* Top Loss Items Breakdown */}
          {topLossItems.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#241C18]">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-400" />
                <span>Bahan Penyumbang Kerugian Terbesar (Top Food Waste & Shrinkage)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topLossItems.map((item, idx) => {
                  const pct = totalLossValue > 0 ? Math.round((item.loss_nominal / totalLossValue) * 100) : 0;
                  return (
                    <div key={idx} className="p-3 rounded-xl bg-[#130E0C] border border-red-500/20 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[130px]">{item.nama}</span>
                          <span className="text-red-400 font-mono font-bold">{item.selisih} {item.satuan}</span>
                        </div>
                        <div className="text-xs text-red-400 font-extrabold mt-1">
                          - {formatRupiah(item.loss_nominal)}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-stone-500 mb-1">
                          <span>Kontribusi Kerugian</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── TABEL STOCK OPNAME ── */}
        <div className="bg-[#1A1412] rounded-3xl shadow-xl border border-[#2D241E] overflow-hidden">
          {/* Table Header Toolbar */}
          <div className="p-5 border-b border-[#2D241E] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#16110F]">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                placeholder="Cari nama bahan baku / alasan..."
                className="w-full pl-10 pr-4 py-2 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-[#F9610D]"
              />
            </div>
            <div className="text-xs text-stone-400">
              Menampilkan {filteredItems.length} dari {items.length} bahan baku
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {itemsLoading ? (
              <div className="py-20 text-center text-stone-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-3" />
                <p className="text-xs">Memuat rincian hitung opname...</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#140F0D] text-stone-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2D241E]">
                  <tr>
                    <th className="px-5 py-3.5">Nama Produk</th>
                    <th className="px-5 py-3.5 text-center">Harga Satuan</th>
                    <th className="px-5 py-3.5 text-center bg-[#181210]">Stok Sistem</th>
                    <th className="px-5 py-3.5 text-center text-[#FFCE00]">Hitung Fisik</th>
                    <th className="px-5 py-3.5 text-center">Selisih</th>
                    <th className="px-5 py-3.5 text-right">Nilai Finansial (Rp)</th>
                    <th className="px-5 py-3.5">Alasan / Catatan Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241B17]">
                  {filteredItems.map((item) => {
                    const selisih = item.selisih || 0;
                    const isMinus = selisih < 0;
                    const isPlus = selisih > 0;
                    const nilai = selisih * parseFloat(item.harga_snapshot || 0);

                    return (
                      <tr key={item.id} className="hover:bg-[#1E1714] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-white block">{item.nama}</span>
                          <span className="text-[11px] text-stone-500 uppercase">{item.satuan}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-stone-400 text-xs font-mono">
                          {formatRupiah(item.harga_snapshot)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-stone-300 bg-[#181210]/50 font-mono">
                          {item.qty_sistem}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isFinal ? (
                            <span className="font-black text-white text-base font-mono">{item.qty_fisik}</span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={item.qty_fisik}
                              onChange={(e) => handleItemChange(item.id, 'qty_fisik', e.target.value)}
                              className="w-20 mx-auto block px-2.5 py-1.5 text-center bg-[#130E0C] border border-[#2D241E] focus:border-[#F9610D] focus:ring-1 focus:ring-[#F9610D] rounded-xl text-white font-mono font-bold text-sm outline-none"
                            />
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono">
                          <span className={isMinus ? 'text-red-400' : isPlus ? 'text-emerald-400' : 'text-stone-500'}>
                            {selisih > 0 ? `+${selisih}` : selisih}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs">
                          <span className={isMinus ? 'text-red-400' : isPlus ? 'text-emerald-400' : 'text-stone-500'}>
                            {isMinus ? `- ${formatRupiah(Math.abs(nilai))}` : isPlus ? `+ ${formatRupiah(nilai)}` : 'Rp 0'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {isFinal ? (
                            <span className="text-stone-300 text-xs truncate max-w-[220px] block" title={item.alasan}>
                              {item.alasan || '-'}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={item.alasan}
                              onChange={(e) => handleItemChange(item.id, 'alasan', e.target.value)}
                              placeholder={selisih !== 0 ? "Wajib diisi alasan selisih..." : "Catatan opsional..."}
                              className={`w-full min-w-[200px] px-3 py-1.5 rounded-xl text-xs outline-none transition-all ${
                                selisih !== 0 && !item.alasan
                                  ? 'bg-red-950/30 border border-red-500/50 text-red-200 placeholder:text-red-400/60 focus:border-red-400'
                                  : 'bg-[#130E0C] border border-[#2D241E] text-white placeholder:text-stone-600 focus:border-[#F9610D]'
                              }`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#140F0D] border-t-2 border-[#2D241E] font-bold">
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-right text-stone-300 text-xs uppercase">Total Selisih Netto:</td>
                    <td className="px-5 py-4 text-center font-mono">
                      <span className={totalSelisihQty < 0 ? 'text-red-400' : totalSelisihQty > 0 ? 'text-emerald-400' : 'text-white'}>
                        {totalSelisihQty > 0 ? `+${totalSelisihQty}` : totalSelisihQty}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm">
                      <span className={netDifference < 0 ? 'text-red-400' : netDifference > 0 ? 'text-emerald-400' : 'text-white'}>
                        {netDifference < 0 ? `- ${formatRupiah(Math.abs(netDifference))}` : netDifference > 0 ? `+ ${formatRupiah(netDifference)}` : 'Rp 0'}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Finalize Modal */}
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1A1412] rounded-3xl shadow-2xl w-full max-w-md border border-[#2D241E] overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-[#2D241E] bg-[#140F0D]">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#F9610D]" />
                  <h3 className="font-bold text-white text-base">Konfirmasi Finalisasi Opname</h3>
                </div>
                <button onClick={() => setShowFinalizeModal(false)} className="text-stone-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-stone-300 leading-relaxed">
                  Setelah difinalisasi, dokumen opname ini akan <strong>dikunci permanen (status FINAL)</strong> dan riwayat kerugian akan tercatat resmi dalam laporan keuangan persediaan.
                </p>

                {totalLossValue > 0 && (
                  <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                    <span className="font-bold text-red-200 block mb-0.5">⚠️ Perhatian Kerugian:</span>
                    Total estimasi kerugian fisik pada sesi ini adalah <strong>{formatRupiah(totalLossValue)}</strong>.
                  </div>
                )}

                <div className="p-4 bg-[#140F0D] border border-[#2D241E] rounded-2xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={applyAdjustment} 
                      onChange={e => setApplyAdjustment(e.target.checked)}
                      className="mt-1 accent-[#F9610D] h-4 w-4 rounded" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Terapkan Penyesuaian Stok (Stock Adjustment)</span>
                      <span className="text-stone-400 block mt-0.5">
                        Jika dicentang, stok sistem akan otomatis diubah menyesuaikan hasil hitungan fisik lapangan.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-5 border-t border-[#2D241E] bg-[#140F0D] flex justify-end gap-3">
                <button 
                  onClick={() => setShowFinalizeModal(false)} 
                  className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleFinalize} 
                  disabled={finalizing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {finalizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle size={16} />}
                  <span>Ya, Finalisasi Dokumen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST MODE ──
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-[#FFCE00]" />
            Stok Opname & Kalkulator Kerugian
          </h1>
          <p className="text-stone-400 mt-1 text-sm">
            Hitung fisik berkala, validasi selisih stok, dan hitung estimasi kerugian bahan baku (Shrinkage/Food Waste)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOpnames}
            className="p-2.5 bg-[#16110F] border border-[#2D241E] hover:border-stone-600 rounded-xl text-stone-300 hover:text-white transition-all cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#F9610D]/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Mulai Opname Baru</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#1A1412] rounded-3xl shadow-xl border border-[#2D241E] overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#140F0D] text-stone-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2D241E]">
              <tr>
                <th className="px-6 py-4">Kode Dokumen</th>
                <th className="px-6 py-4">Tanggal Pelaksanaan</th>
                <th className="px-6 py-4">Cabang / Outlet</th>
                <th className="px-6 py-4">Petugas Opname</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241B17]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-stone-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-2" />
                    Memuat data opname...
                  </td>
                </tr>
              ) : opnames.length > 0 ? (
                opnames.map((op) => (
                  <tr 
                    key={op.id} 
                    className="hover:bg-[#1E1714] transition-colors group cursor-pointer" 
                    onClick={() => openDetail(op)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#FFCE00]">
                      {op.kode}
                    </td>
                    <td className="px-6 py-4 text-stone-300 text-xs">
                      {new Date(op.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {op.outlet_name}
                    </td>
                    <td className="px-6 py-4 text-stone-400 text-xs">
                      {op.creator_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {op.status === 'FINAL' ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                          FINAL
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-950/60 border border-amber-500/40 text-amber-400">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#F9610D] group-hover:text-amber-400 font-bold text-xs transition-colors flex items-center gap-1 ml-auto">
                        <span>Buka Detail & Kalkulator</span>
                        <span>&rarr;</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-stone-500">
                    <FileText size={32} className="mx-auto mb-2 opacity-30"/>
                    Belum ada dokumen opname yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Mulai Opname Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1412] rounded-3xl shadow-2xl w-full max-w-md border border-[#2D241E] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-[#2D241E] bg-[#140F0D]">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="w-5 h-5 text-[#F9610D]" />
                <h3 className="font-bold text-white text-base">Mulai Opname Baru</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {user?.role !== 'STAF_CABANG' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Cabang / Outlet</label>
                  <select 
                    required 
                    value={createData.outlet_id} 
                    onChange={e => setCreateData({...createData, outlet_id: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                  >
                    <option value="">-- Pilih Outlet --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">Tanggal Pelaksanaan Opname</label>
                <input 
                  type="date" 
                  required 
                  value={createData.tanggal} 
                  onChange={e => setCreateData({...createData, tanggal: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]" 
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#140F0D] border border-[#2D241E] text-xs text-stone-400">
                Sistem akan membuat snapshot otomatis dari seluruh data stok fisik dan harga satuan bahan baku saat ini.
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-[#2D241E]">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={creating} 
                  className="px-5 py-2.5 bg-[#F9610D] hover:bg-[#d9530a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <RefreshCw size={14} className="animate-spin" />}
                  <span>Buat Draf Dokumen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opname;
