import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { ClipboardCheck, Search, Plus, RefreshCw, FileText, CheckCircle, AlertTriangle, X, Lock } from 'lucide-react';
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

  const fetchOpnames = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/opnames');
      setOpnames(res?.data || []);
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
        setOutlets(res?.data || []);
        if (res?.data?.length > 0) {
          setCreateData(prev => ({ ...prev, outlet_id: res.data[0].id }));
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
      if (res?.data) {
        openDetail(res.data);
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
      const stockItems = res?.data?.items || [];
      setItems(stockItems.map(item => ({
        ...item,
        qty_fisik: item.qty_fisik !== null ? item.qty_fisik : item.qty_sistem,
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
          const fisik = parseInt(value) || 0;
          updated.qty_fisik = fisik >= 0 ? fisik : 0;
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
      toast.success('Perubahan berhasil disimpan');
      // Update selectedOpname locally to reflect possible changes
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan item');
    } finally {
      setSavingItems(false);
    }
  };

  const handleFinalize = async () => {
    // Check if any selisih != 0 is missing reason
    const missingReason = items.some(i => i.selisih !== 0 && (!i.alasan || i.alasan.trim() === ''));
    if (missingReason) {
      return toast.error('Harap isi alasan untuk semua barang yang memiliki selisih.');
    }

    setFinalizing(true);
    try {
      // First save items
      const payloadItems = {
        stockItems: items.map(i => ({
          id: i.id,
          qty_fisik: i.qty_fisik,
          alasan: i.alasan
        }))
      };
      await axiosClient.put(`/opnames/${selectedOpname.id}/items`, payloadItems);

      // Then finalize
      await axiosClient.patch(`/opnames/${selectedOpname.id}/finalize`, {
        apply_adjustment: applyAdjustment
      });

      toast.success('Opname berhasil diselesaikan (FINAL)');
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

  if (viewMode === 'detail' && selectedOpname) {
    const isFinal = selectedOpname.status === 'FINAL';
    const totalSelisihQty = items.reduce((acc, i) => acc + (i.selisih || 0), 0);
    const totalSelisihNilai = items.reduce((acc, i) => acc + ((i.selisih || 0) * parseFloat(i.harga_snapshot || 0)), 0);

    return (
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => setViewMode('list')} className="text-sm font-medium text-muted hover:text-ink flex items-center gap-1 mb-2 transition-colors">
              &larr; Kembali ke Daftar
            </button>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              Detail Opname: {selectedOpname.kode}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {selectedOpname.outlet_name} • Tanggal: {new Date(selectedOpname.tanggal).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFinal ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
                <Lock size={18} />
                Dokumen Final
              </div>
            ) : (
              <>
                <button 
                  onClick={handleSaveItems} 
                  disabled={savingItems}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-line hover:bg-cream text-ink rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={savingItems ? 'animate-spin' : ''} />
                  Simpan Draf
                </button>
                <button 
                  onClick={() => setShowFinalizeModal(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <CheckCircle size={18} />
                  Finalisasi Opname
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            {itemsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-richisam-orange mb-3" size={32} />
                <p className="text-muted text-sm">Memuat item opname...</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-cream/50 text-muted font-semibold border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3 text-center">Harga</th>
                    <th className="px-4 py-3 text-center bg-gray-50/50">Stok Sistem</th>
                    <th className="px-4 py-3 text-center text-richisam-orange">Hitung Fisik</th>
                    <th className="px-4 py-3 text-center">Selisih</th>
                    <th className="px-4 py-3 text-right">Nilai Selisih</th>
                    <th className="px-4 py-3">Alasan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => {
                    const selisih = item.selisih || 0;
                    const isMinus = selisih < 0;
                    const isPlus = selisih > 0;
                    
                    return (
                      <tr key={item.id} className="hover:bg-cream/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-ink">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-center text-muted">{formatRupiah(item.harga_snapshot)}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-600 bg-gray-50/50">{item.qty_sistem}</td>
                        <td className="px-4 py-2.5">
                          {isFinal ? (
                            <div className="text-center font-bold text-ink">{item.qty_fisik}</div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={item.qty_fisik === 0 && item.qty_sistem === 0 ? '' : item.qty_fisik}
                              onChange={(e) => handleItemChange(item.id, 'qty_fisik', e.target.value)}
                              className="w-24 mx-auto block px-2 py-1.5 text-center border border-line rounded focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none font-bold bg-white"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">
                          <span className={isMinus ? 'text-red-600' : isPlus ? 'text-green-600' : 'text-gray-400'}>
                            {selisih > 0 ? '+' : ''}{selisih}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                           <span className={isMinus ? 'text-red-600' : isPlus ? 'text-green-600' : 'text-gray-400'}>
                            {formatRupiah(selisih * parseFloat(item.harga_snapshot))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {isFinal ? (
                            <div className="text-ink/80 text-sm truncate max-w-[200px]" title={item.alasan}>{item.alasan || '-'}</div>
                          ) : (
                            <input
                              type="text"
                              value={item.alasan}
                              onChange={(e) => handleItemChange(item.id, 'alasan', e.target.value)}
                              placeholder={selisih !== 0 ? "Wajib diisi..." : "Opsional"}
                              className={`w-full min-w-[200px] px-3 py-1.5 border rounded text-sm focus:outline-none ${selisih !== 0 && !item.alasan ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-1 focus:ring-red-400' : 'border-line bg-white focus:border-richisam-orange focus:ring-1 focus:ring-richisam-orange'}`}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-cream border-t-2 border-line">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-ink">Total Selisih:</td>
                    <td className="px-4 py-3 text-center font-bold">
                       <span className={totalSelisihQty < 0 ? 'text-red-600' : totalSelisihQty > 0 ? 'text-green-600' : 'text-ink'}>
                          {totalSelisihQty > 0 ? '+' : ''}{totalSelisihQty}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                       <span className={totalSelisihNilai < 0 ? 'text-red-600' : totalSelisihNilai > 0 ? 'text-green-600' : 'text-ink'}>
                          {formatRupiah(totalSelisihNilai)}
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
           <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
               <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
                 <h2 className="font-bold text-ink text-lg flex items-center gap-2">
                   <AlertTriangle className="text-richisam-orange" /> Konfirmasi Finalisasi
                 </h2>
                 <button onClick={() => setShowFinalizeModal(false)} className="text-muted hover:text-ink"><X size={20} /></button>
               </div>
               <div className="p-5 space-y-4">
                 <p className="text-sm text-ink leading-relaxed">
                   Anda yakin ingin memfinalisasi opname ini? Setelah final, data <strong>tidak dapat diubah kembali</strong>.
                 </p>
                 <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                   <label className="flex items-start gap-3 cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={applyAdjustment} 
                       onChange={e => setApplyAdjustment(e.target.checked)}
                       className="mt-1 text-richisam-orange focus:ring-richisam-orange border-line rounded" 
                     />
                     <div className="text-sm">
                       <span className="font-bold text-orange-900 block">Terapkan Penyesuaian Stok (Adjustment)</span>
                       <span className="text-orange-800/80">Jika dicentang, stok sistem saat ini akan otomatis diubah (ditimpa) menjadi stok fisik hasil hitungan opname.</span>
                     </div>
                   </label>
                 </div>
               </div>
               <div className="p-4 border-t border-line flex justify-end gap-3 bg-gray-50">
                 <button onClick={() => setShowFinalizeModal(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                 <button 
                   onClick={handleFinalize} 
                   disabled={finalizing}
                   className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50 transition-colors"
                 >
                   {finalizing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                   Ya, Finalisasi
                 </button>
               </div>
             </div>
           </div>
        )}
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-richisam-orange" />
            Stok Opname
          </h1>
          <p className="mt-1 text-sm text-muted">Lakukan hitung fisik secara berkala untuk mencocokkan stok.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOpnames}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} />
            Mulai Opname Baru
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Kode Dokumen</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4">Pembuat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted">Memuat data...</td></tr>
              ) : opnames.length > 0 ? (
                opnames.map((op) => (
                  <tr key={op.id} className="hover:bg-cream/30 transition-colors group cursor-pointer" onClick={() => openDetail(op)}>
                    <td className="px-6 py-4 font-bold text-ink">{op.kode}</td>
                    <td className="px-6 py-4 text-ink/80">{new Date(op.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 font-medium">{op.outlet_name}</td>
                    <td className="px-6 py-4 text-muted">{op.creator_name}</td>
                    <td className="px-6 py-4">
                      {op.status === 'FINAL' ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border uppercase bg-green-50 border-green-200 text-green-700">FINAL</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border uppercase bg-orange-50 border-orange-200 text-orange-700">DRAFT</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">Lihat Detail &rarr;</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Belum ada dokumen opname.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Mulai Opname Baru</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {user?.role !== 'STAF_CABANG' && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Cabang/Outlet</label>
                  <select required value={createData.outlet_id} onChange={e => setCreateData({...createData, outlet_id: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                    <option value="">-- Pilih Outlet --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Tanggal Opname</label>
                <input type="date" required value={createData.tanggal} onChange={e => setCreateData({...createData, tanggal: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-line">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={creating} className="px-5 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {creating && <RefreshCw size={16} className="animate-spin" />} Buat Draf
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
