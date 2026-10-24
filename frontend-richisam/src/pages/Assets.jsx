import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Package, Search, RefreshCw, FileText, Wrench, Edit3, Plus, X, Check, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const Assets = () => {
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State - Update Kondisi Stok Aset (Cabang & Pusat)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editQtyBaik, setEditQtyBaik] = useState(0);
  const [editQtyRusak, setEditQtyRusak] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State - Tambah Master Aset Baru (Admin Pusat & Owner)
  const [isAddMasterModalOpen, setIsAddMasterModalOpen] = useState(false);
  const [newAssetNama, setNewAssetNama] = useState('');
  const [newAssetKategori, setNewAssetKategori] = useState('Peralatan');
  const [newAssetKode, setNewAssetKode] = useState('');
  const [isCreatingMaster, setIsCreatingMaster] = useState(false);

  const fetchOutlets = async () => {
    if (user?.role !== 'STAF_CABANG') {
      try {
        const res = await axiosClient.get('/outlets');
        const list = res?.data?.data || res?.data || [];
        setOutlets(list);
        if (list.length > 0) {
          setSelectedOutlet(list[0].id.toString());
        }
      } catch (e) {}
    } else {
      setSelectedOutlet(user.outlet_id?.toString() || '');
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, [user]);

  const fetchAssets = async () => {
    if (!selectedOutlet) return;
    try {
      setLoading(true);
      const res = await axiosClient.get(`/assets/stocks`, {
        params: { outlet_id: selectedOutlet }
      });
      setAssets(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data aset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOutlet) {
      fetchAssets();
    }
  }, [selectedOutlet]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedOutlet]);

  const filteredAssets = assets.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.nama?.toLowerCase().includes(q) || a.kode?.toLowerCase().includes(q);
  });

  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Buka Modal Edit Kondisi Aset
  const handleOpenEdit = (asset) => {
    setSelectedAsset(asset);
    setEditQtyBaik(asset.qty_baik || 0);
    setEditQtyRusak(asset.qty_rusak || 0);
    setIsEditModalOpen(true);
  };

  // Simpan Update Kondisi Aset
  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!selectedAsset || !selectedOutlet) return;

    try {
      setIsSaving(true);
      const payload = {
        items: [
          {
            asset_id: selectedAsset.id,
            qty_baik: Math.max(0, parseInt(editQtyBaik, 10) || 0),
            qty_rusak: Math.max(0, parseInt(editQtyRusak, 10) || 0)
          }
        ]
      };

      await axiosClient.put(`/assets/stocks?outlet_id=${selectedOutlet}`, payload);
      toast.success(`Kondisi peralatan "${selectedAsset.nama}" berhasil diperbarui!`);
      setIsEditModalOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui kondisi peralatan');
    } finally {
      setIsSaving(false);
    }
  };

  // Simpan Tambah Master Aset Baru (Admin Pusat / Owner)
  const handleSaveMaster = async (e) => {
    e.preventDefault();
    if (!newAssetNama.trim()) {
      toast.error('Nama peralatan harus diisi');
      return;
    }

    try {
      setIsCreatingMaster(true);
      await axiosClient.post('/assets', {
        nama: newAssetNama.trim(),
        kategori: newAssetKategori.trim() || 'Peralatan',
        kode: newAssetKode.trim() || undefined
      });
      toast.success('Peralatan baru berhasil ditambahkan!');
      setIsAddMasterModalOpen(false);
      setNewAssetNama('');
      setNewAssetKode('');
      setNewAssetKategori('Peralatan');
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan master peralatan');
    } finally {
      setIsCreatingMaster(false);
    }
  };

  const isManagementRole = user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER';

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Wrench className="h-6 w-6 text-richisam-orange" />
            Inventaris Peralatan
          </h1>
          <p className="mt-1 text-sm text-muted">Pantau jumlah dan update kondisi fisik aset non-habis pakai per cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          {isManagementRole && (
            <button
              onClick={() => setIsAddMasterModalOpen(true)}
              id="btn-tambah-master-aset"
              className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-richisam-orange/90 text-white rounded-xl text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>+ Tambah Peralatan</span>
            </button>
          )}
          <button 
            onClick={fetchAssets}
            title="Segarkan Data"
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line bg-cream/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          {user?.role !== 'STAF_CABANG' && (
             <div className="w-full sm:w-64">
               <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 block">Cabang / Outlet</label>
               <select 
                 value={selectedOutlet}
                 onChange={(e) => setSelectedOutlet(e.target.value)}
                 className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
               >
                 {outlets.map(o => (
                   <option key={o.id} value={o.id}>{o.nama}</option>
                 ))}
               </select>
             </div>
          )}
          <div className="relative w-full sm:w-72 mt-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kode peralatan..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Kode Aset</th>
                <th className="px-6 py-4">Nama Peralatan</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-center text-green-700">Kondisi Baik</th>
                <th className="px-6 py-4 text-center text-red-700">Kondisi Rusak</th>
                <th className="px-6 py-4 text-center font-bold">Total Qty</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredAssets.length > 0 ? (
                paginatedAssets.map((a) => {
                  const qtyBaik = a.qty_baik || 0;
                  const qtyRusak = a.qty_rusak || 0;
                  const total = qtyBaik + qtyRusak;

                  return (
                    <tr key={a.id} className="hover:bg-cream/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-ink">{a.kode}</td>
                      <td className="px-6 py-4 font-semibold text-ink">{a.nama}</td>
                      <td className="px-6 py-4 text-muted">{a.kategori || 'Peralatan'}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-700 bg-green-50/30">{qtyBaik}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-700 bg-red-50/30">{qtyRusak}</td>
                      <td className="px-6 py-4 text-center font-bold bg-gray-50/50">{total}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          id={`btn-edit-aset-${a.id}`}
                          className="btn-action-amber inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
                          title="Perbarui jumlah fisik kondisi baik & rusak"
                        >
                          <Edit3 size={13} />
                          <span>Edit Kondisi</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data peralatan di cabang ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalCount={filteredAssets.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL UPDATE KONDISI ASET */}
      {isEditModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-line bg-cream/40 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">Update Kondisi Peralatan</h3>
                  <p className="text-xs text-muted">Sesuaikan jumlah fisik aset di cabang ini.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-ink hover:bg-cream transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-5 space-y-4">
              {/* Info Aset */}
              <div className="p-3.5 rounded-xl bg-cream/50 border border-line">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-richisam-orange uppercase tracking-wider">{selectedAsset.kode}</span>
                  <span className="text-xs text-muted bg-white px-2 py-0.5 rounded border border-line">{selectedAsset.kategori || 'Peralatan'}</span>
                </div>
                <h4 className="font-bold text-ink text-base">{selectedAsset.nama}</h4>
              </div>

              {/* Input Kondisi Baik */}
              <div>
                <label className="block text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Kondisi Baik (Siap Pakai)</span>
                  <span className="text-[10px] text-muted lowercase font-normal">unit</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    id="input-qty-baik"
                    required
                    value={editQtyBaik}
                    onChange={(e) => setEditQtyBaik(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl text-ink font-bold text-base focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Input Kondisi Rusak */}
              <div>
                <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Kondisi Rusak (Patah / Perlu Servis)</span>
                  <span className="text-[10px] text-muted lowercase font-normal">unit</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    id="input-qty-rusak"
                    required
                    value={editQtyRusak}
                    onChange={(e) => setEditQtyRusak(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-ink font-bold text-base focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Ringkasan Total */}
              <div className="p-3 bg-gray-50 border border-line rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Total Unit Fisik:</span>
                <span className="text-base font-black text-ink">
                  {(parseInt(editQtyBaik, 10) || 0) + (parseInt(editQtyRusak, 10) || 0)} unit
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-ink text-sm font-semibold hover:bg-cream transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="btn-simpan-kondisi-aset"
                  className="px-5 py-2 rounded-xl bg-richisam-orange hover:bg-richisam-orange/90 text-white text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH MASTER ASET (ADMIN PUSAT & OWNER) */}
      {isAddMasterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-line bg-cream/40 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-richisam-orange/10 text-richisam-orange border border-richisam-orange/20">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">Tambah Master Peralatan</h3>
                  <p className="text-xs text-muted">Daftarkan item peralatan baru ke sistem inventaris.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMasterModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-ink hover:bg-cream transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Nama Peralatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Grinder Kopi Eureka, Blender Commercial"
                  value={newAssetNama}
                  onChange={(e) => setNewAssetNama(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <input
                  type="text"
                  placeholder="Peralatan, Mesin, Wadah, dsb."
                  value={newAssetKategori}
                  onChange={(e) => setNewAssetKategori(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Kode Aset (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk auto-generate (AST-xxx)"
                  value={newAssetKode}
                  onChange={(e) => setNewAssetKode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
                <p className="text-[11px] text-muted mt-1">Jika dikosongkan, sistem akan mengurutkan otomatis.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddMasterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-ink text-sm font-semibold hover:bg-cream transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMaster}
                  className="px-5 py-2 rounded-xl bg-richisam-orange hover:bg-richisam-orange/90 text-white text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreatingMaster ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan Aset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
