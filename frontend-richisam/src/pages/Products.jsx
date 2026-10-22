import useAuthStore from '../store/useAuthStore';
import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  Package, Search, Plus, RefreshCw, FileText, AlertTriangle, 
  Edit2, X, Check, Filter, Trash2, RotateCcw, ShieldAlert, 
  CheckCircle2, Database, Archive
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const Products = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  
  // Modal state for Edit/Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ 
    kode: '', 
    nama: '', 
    kategori: '', 
    satuan: '', 
    satuan_besar: '', 
    konversi: 1, 
    urutan: 0, 
    harga: 0, 
    satuan_perlu_konfirmasi: false,
    is_active: true
  });

  // Bulk edit state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);

  // Smart Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/products?limit=1000&status=${statusFilter}`);
      setProducts(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  const filteredProducts = products.filter(p => {
    let match = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      match = p.nama?.toLowerCase().includes(q) || 
              p.kode?.toLowerCase().includes(q);
    }
    if (match && categoryFilter) {
      match = p.kategori === categoryFilter;
    }
    return match;
  });

  const uniqueCategories = [...new Set(products.map(p => p.kategori).filter(Boolean))];
  const countNeedConfirm = products.filter(p => p.satuan_perlu_konfirmasi).length;

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        kode: product.kode || '',
        nama: product.nama || '',
        kategori: product.kategori || '',
        satuan: product.satuan || '',
        satuan_besar: product.satuan_besar || product.satuan || '',
        konversi: product.konversi ? parseInt(product.konversi, 10) : 1,
        urutan: product.urutan !== undefined && product.urutan !== null ? parseInt(product.urutan, 10) : 0,
        harga: product.harga !== undefined && product.harga !== null ? Math.round(parseFloat(product.harga)) : 0,
        satuan_perlu_konfirmasi: product.satuan_perlu_konfirmasi || false,
        is_active: product.is_active !== undefined ? product.is_active : true
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        kode: '', 
        nama: '', 
        kategori: '', 
        satuan: '', 
        satuan_besar: '', 
        konversi: 1, 
        urutan: 0, 
        harga: 0, 
        satuan_perlu_konfirmasi: false,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axiosClient.put(`/products/${editingProduct.id}`, formData);
        toast.success('Produk berhasil diperbarui');
      } else {
        await axiosClient.post('/products', formData);
        toast.success('Produk berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan produk');
    }
  };

  // Smart Delete Handlers
  const openDeleteModal = async (product) => {
    setSelectedProductForDelete(product);
    setIsDeleteModalOpen(true);
    setIsCheckingUsage(true);
    setUsageData(null);
    try {
      const res = await axiosClient.get(`/products/${product.id}/usage`);
      const payload = res?.data || res;
      setUsageData(payload);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memeriksa riwayat transaksi produk');
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const handleDeleteProduct = async (mode = 'auto') => {
    if (!selectedProductForDelete) return;
    try {
      setIsSubmittingDelete(true);
      const res = await axiosClient.delete(`/products/${selectedProductForDelete.id}?mode=${mode}`);
      const msg = res?.message || res?.data?.message || 'Operasi berhasil';
      toast.success(msg);
      setIsDeleteModalOpen(false);
      setSelectedProductForDelete(null);
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus produk');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleRestoreProduct = async (product) => {
    try {
      const res = await axiosClient.patch(`/products/${product.id}/restore`);
      const msg = res?.message || res?.data?.message || `Produk "${product.nama}" berhasil diaktifkan kembali!`;
      toast.success(msg);
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengaktifkan kembali produk');
    }
  };

  const openBulkEdit = () => {
    const needConfirms = products.filter(p => p.satuan_perlu_konfirmasi).map(p => ({
      id: p.id,
      nama: p.nama,
      satuan: p.satuan
    }));
    setBulkItems(needConfirms);
    setIsBulkOpen(true);
  };

  const handleBulkSave = async () => {
    try {
      const promises = bulkItems.map(item => 
        axiosClient.put(`/products/${item.id}`, { 
          satuan: item.satuan, 
          satuan_perlu_konfirmasi: false 
        })
      );
      await Promise.all(promises);
      toast.success('Satuan massal berhasil diperbarui');
      setIsBulkOpen(false);
      fetchProducts();
    } catch (e) {
      toast.error('Gagal memperbarui satuan secara massal');
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Package className="h-6 w-6 text-richisam-orange" />
            Master Data Produk
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola detail produk, kategori, satuan, harga, dan siklus hidup produk.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {countNeedConfirm > 0 && (
            <button 
              onClick={openBulkEdit}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium transition-colors border border-yellow-300"
            >
              <AlertTriangle size={18} />
              Konfirmasi {countNeedConfirm} Satuan
            </button>
          )}
          <button 
            onClick={fetchProducts}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role !== 'OWNER' && (
            <button 
              onClick={() => openModal(null)}
              className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Tambah Produk
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar with Search, Category, and Status Pills */}
        <div className="p-4 border-b border-line bg-cream/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode atau nama produk..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
              />
            </div>
            <div className="relative w-full sm:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all appearance-none"
              >
                <option value="">Semua Kategori</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs (Aktif, Nonaktif, Semua) */}
          <div className="flex items-center gap-1 p-1 bg-cream/70 dark:bg-stone-900/60 rounded-xl border border-line text-xs font-semibold self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'active'
                  ? 'bg-richisam-orange text-white shadow-xs font-bold'
                  : 'text-muted hover:text-ink hover:bg-white/40'
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-richisam-orange text-white shadow-xs font-bold'
                  : 'text-muted hover:text-ink hover:bg-white/40'
              }`}
            >
              Nonaktif / Arsip
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-richisam-orange text-white shadow-xs font-bold'
                  : 'text-muted hover:text-ink hover:bg-white/40'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Urutan</th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Satuan Besar</th>
                <th className="px-6 py-4">Satuan Kecil</th>
                <th className="px-6 py-4">Rasio (Konversi)</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted">Memuat data produk...</td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                [...filteredProducts]
                  .sort((a,b) => (a.urutan || 0) - (b.urutan || 0))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((p) => (
                  <tr 
                    key={p.id} 
                    className={`transition-colors group ${
                      p.is_active === false 
                        ? 'opacity-70 bg-stone-500/5 hover:bg-stone-500/10' 
                        : 'hover:bg-cream/30'
                    }`}
                  >
                    <td className="px-6 py-4 text-muted">{p.urutan}</td>
                    <td className="px-6 py-4 font-medium text-ink">{p.kode}</td>
                    <td className="px-6 py-4 font-semibold text-ink">
                      <div className="flex items-center gap-2">
                        <span>{p.nama}</span>
                        {p.is_active === false && (
                          <span className="text-[10px] text-muted font-mono italic">(Diarsipkan)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink/80">
                      <span className="px-2.5 py-0.5 bg-stone-800 text-stone-200 border border-stone-700/60 rounded-full text-[11px] font-bold">{p.kategori || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {p.is_active === false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/15 text-rose-500 border border-rose-500/30 rounded-full text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Nonaktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 rounded-full text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{p.satuan_besar || p.satuan}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{p.satuan}</span>
                        {p.satuan_perlu_konfirmasi && (
                          <span title="Satuan perlu konfirmasi" className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink/80 text-sm">
                      1 <span className="font-semibold">{p.satuan_besar || p.satuan}</span> = {p.konversi || 1} <span className="font-semibold">{p.satuan}</span>
                    </td>
                    <td className="px-6 py-4 text-ink font-medium">{formatRupiah(p.harga)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.is_active === false ? (
                          <>
                            {user?.role !== 'OWNER' && (
                              <button 
                                onClick={() => handleRestoreProduct(p)} 
                                className="btn-action-emerald inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs" 
                                title="Aktifkan Kembali Produk"
                              >
                                <RotateCcw size={13} />
                                <span>Aktifkan</span>
                              </button>
                            )}
                            <button 
                              onClick={() => openModal(p)} 
                              className="btn-action-orange inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs" 
                              title="Edit Detail Produk"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            {user?.role !== 'OWNER' && (
                              <button 
                                onClick={() => openDeleteModal(p)} 
                                className="btn-action-rose inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs" 
                                title="Kelola Penghapusan / Cek Riwayat"
                              >
                                <Trash2 size={13} />
                                <span>Hapus</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => openModal(p)} 
                              className="btn-action-orange inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs" 
                              title="Edit Produk"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            {user?.role !== 'OWNER' && (
                              <button 
                                onClick={() => openDeleteModal(p)} 
                                className="btn-action-rose inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs" 
                                title="Hapus / Nonaktifkan Produk"
                              >
                                <Trash2 size={13} />
                                <span>Hapus</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-muted">
                    <FileText size={24} className="mx-auto mb-2 opacity-50"/>
                    Tidak ada data produk yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination 15 Data Per Halaman */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Edit/Add */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-line bg-cream/30">
              <h2 className="font-bold text-lg text-ink">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-muted hover:text-ink rounded-lg transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Kode</label>
                  <input type="text" required placeholder="Misal: PRD-001" value={formData.kode} onChange={e => setFormData({...formData, kode: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all font-mono font-medium"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Urutan</label>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    required 
                    placeholder="0"
                    value={formData.urutan === 0 ? '' : formData.urutan} 
                    onChange={e => setFormData({...formData, urutan: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0})} 
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Nama Produk</label>
                <input type="text" required placeholder="Nama bahan atau barang" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Kategori</label>
                  <input 
                    type="text" 
                    list="kategori-options"
                    placeholder="Pilih atau ketik kategori" 
                    value={formData.kategori} 
                    onChange={e => setFormData({...formData, kategori: e.target.value})} 
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"
                  />
                  <datalist id="kategori-options">
                    {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Satuan Kecil (Cabang)</label>
                  <input type="text" placeholder="Misal: pcs, pack, gram, botol" required value={formData.satuan} onChange={e => setFormData({...formData, satuan: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Satuan Besar (Gudang)</label>
                  <input type="text" placeholder="Misal: dus, bal, karung, slop" required value={formData.satuan_besar} onChange={e => setFormData({...formData, satuan_besar: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Rasio Konversi</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    step="1"
                    value={formData.konversi} 
                    onChange={e => setFormData({...formData, konversi: Math.max(1, parseInt(e.target.value, 10) || 1)})} 
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Harga (Per Satuan Terkecil)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500 font-semibold select-none">Rp</span>
                  <input 
                    type="number" 
                    step="1" 
                    min="0" 
                    required 
                    placeholder="0"
                    value={formData.harga === 0 ? '' : formData.harga} 
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                      setFormData({...formData, harga: val});
                    }} 
                    className="w-full pl-11 pr-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all font-mono font-medium text-ink"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="satuanConfirm" checked={formData.satuan_perlu_konfirmasi} onChange={e => setFormData({...formData, satuan_perlu_konfirmasi: e.target.checked})} className="w-4 h-4 text-richisam-orange focus:ring-richisam-orange rounded border-line cursor-pointer"/>
                  <label htmlFor="satuanConfirm" className="text-sm text-ink cursor-pointer">Satuan Perlu Dikonfirmasi</label>
                </div>
                {editingProduct && (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="isActiveCheck" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-line cursor-pointer"/>
                    <label htmlFor="isActiveCheck" className="text-sm text-ink cursor-pointer font-medium">Status Produk Aktif</label>
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-line mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted hover:text-ink font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                  <Check size={18}/> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      {isDeleteModalOpen && selectedProductForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-line flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-line bg-rose-500/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 text-rose-600">
                <Trash2 size={22} className="stroke-[2.5]" />
                <div>
                  <h2 className="font-bold text-base text-ink">Smart Delete Produk</h2>
                  <p className="text-xs text-muted">Pemeriksaan integritas riwayat transaksi produk</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="p-1 text-muted hover:text-ink rounded-lg transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Product Info Card */}
              <div className="p-3.5 rounded-xl border border-line bg-cream/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">{selectedProductForDelete.kode}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedProductForDelete.is_active !== false 
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' 
                      : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                  }`}>
                    {selectedProductForDelete.is_active !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink">{selectedProductForDelete.nama}</h3>
                <p className="text-xs text-muted">Kategori: <span className="font-semibold text-ink">{selectedProductForDelete.kategori || '-'}</span> • Satuan: <span className="font-semibold text-ink">{selectedProductForDelete.satuan}</span></p>
              </div>

              {/* Status Checking or Result */}
              {isCheckingUsage ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                  <RefreshCw size={26} className="animate-spin text-richisam-orange" />
                  <p className="text-sm font-medium text-ink">Memeriksa riwayat mutasi stok & transaksi produk...</p>
                  <p className="text-xs text-muted max-w-xs">Mengecek relasi ke mutasi harian, tiket restock cabang, laporan defect, dan stok fisik.</p>
                </div>
              ) : usageData ? (
                <div className="space-y-4">
                  {/* Grid Stat Riwayat */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                      <Database size={13} />
                      Analisis Data Database:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg border border-line bg-cream/20">
                        <span className="text-muted block text-[11px]">Riwayat Mutasi Shift:</span>
                        <span className="font-bold text-ink text-sm">{usageData.usage.mutationCount} catatan</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-line bg-cream/20">
                        <span className="text-muted block text-[11px]">Tiket Restock:</span>
                        <span className="font-bold text-ink text-sm">{usageData.usage.ticketCount} tiket</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-line bg-cream/20">
                        <span className="text-muted block text-[11px]">Laporan Kerusakan:</span>
                        <span className="font-bold text-ink text-sm">{usageData.usage.defectCount} laporan</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-line bg-cream/20">
                        <span className="text-muted block text-[11px]">Stock Opname:</span>
                        <span className="font-bold text-ink text-sm">{usageData.usage.opnameCount} opname</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-line bg-cream/20 col-span-2 sm:col-span-2">
                        <span className="text-muted block text-[11px]">Sisa Stok Fisik Seluruh Outlet:</span>
                        <span className={`font-bold text-sm ${usageData.usage.currentStock > 0 ? 'text-amber-600' : 'text-ink'}`}>
                          {usageData.usage.currentStock} {selectedProductForDelete.satuan}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KONDISI A: Ada Transaksi (Wajib Soft Delete / Deaktivasi) */}
                  {usageData.usage.hasTransactions ? (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                            Proteksi Integritas Data Skripsi Aktif
                          </h4>
                          <p className="text-xs mt-1 leading-relaxed">
                            Produk ini sudah memiliki riwayat mutasi dan operasional. Hapus permanen akan merusak buku besar stok dan laporan bulanan masa lalu.
                          </p>
                          <p className="text-xs mt-1 leading-relaxed font-semibold">
                            Sistem akan melakukan <span className="underline">Soft Delete (Nonaktifkan)</span>: produk disembunyikan dari operasional staf cabang harian, namun laporan audit skripsi masa lalu tetap 100% aman dan utuh.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* KONDISI B: Bersih / Belum Pernah Ada Transaksi (Bisa Hard Delete) */
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                            Produk Bersih (Belum Ada Riwayat Transaksi)
                          </h4>
                          <p className="text-xs mt-1 leading-relaxed">
                            Produk ini belum pernah digunakan dalam mutasi shift, restock, maupun opname, dan sisa stok adalah 0. 
                          </p>
                          <p className="text-xs mt-1 leading-relaxed">
                            Anda dapat memilih untuk **Hapus Permanen** dari database (cocok jika salah ketik input) atau **Nonaktifkan Saja**.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-line bg-cream/20 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isSubmittingDelete}
                className="px-4 py-2 text-muted hover:text-ink font-medium text-xs sm:text-sm rounded-lg transition-colors"
              >
                Batal
              </button>

              {usageData && (
                <>
                  {usageData.usage.hasTransactions ? (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteProduct('soft')} 
                      disabled={isSubmittingDelete}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Archive size={15} />
                      {isSubmittingDelete ? 'Memproses...' : 'Nonaktifkan Produk (Arsip)'}
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteProduct('soft')} 
                        disabled={isSubmittingDelete}
                        className="px-3.5 py-2 bg-stone-700 hover:bg-stone-800 text-stone-200 font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Archive size={15} />
                        Nonaktifkan Saja
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteProduct('hard')} 
                        disabled={isSubmittingDelete}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        {isSubmittingDelete ? 'Menghapus...' : 'Hapus Permanen'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-line bg-cream/30 shrink-0">
              <h2 className="font-bold text-lg text-ink flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" size={20}/>
                Konfirmasi Massal Satuan
              </h2>
              <button onClick={() => setIsBulkOpen(false)} className="p-1 text-muted hover:text-ink rounded-lg transition-colors"><X size={20}/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <p className="text-sm text-muted mb-4">Silakan periksa dan perbaiki satuan untuk produk-produk di bawah ini, lalu klik Simpan.</p>
              {bulkItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium text-ink truncate">{item.nama}</div>
                  <input 
                    type="text" 
                    value={item.satuan} 
                    onChange={e => {
                      const newItems = [...bulkItems];
                      newItems[idx].satuan = e.target.value;
                      setBulkItems(newItems);
                    }}
                    className="w-32 px-3 py-1.5 border border-line rounded-lg text-sm focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="p-4 flex justify-end gap-3 border-t border-line bg-gray-50 shrink-0">
              <button type="button" onClick={() => setIsBulkOpen(false)} className="px-4 py-2 text-muted hover:text-ink font-medium">Batal</button>
              <button onClick={handleBulkSave} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Check size={18}/> Simpan Massal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
