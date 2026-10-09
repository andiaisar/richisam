import useAuthStore from '../store/useAuthStore';
import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Package, Search, Plus, RefreshCw, FileText, AlertTriangle, Edit2, X, Check, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Products = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modal state for Edit/Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ kode: '', nama: '', kategori: '', satuan: '', urutan: 0, harga: 0, satuan_perlu_konfirmasi: false });

  // Bulk edit state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // fetch all products by sending limit=1000
      const res = await axiosClient.get('/products?limit=1000');
      setProducts(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
        urutan: product.urutan || 0,
        harga: product.harga || 0,
        satuan_perlu_konfirmasi: product.satuan_perlu_konfirmasi || false
      });
    } else {
      setEditingProduct(null);
      setFormData({ kode: '', nama: '', kategori: '', satuan: '', urutan: 0, harga: 0, satuan_perlu_konfirmasi: false });
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
          <p className="mt-1 text-sm text-muted">Kelola detail produk, kategori, satuan, dan harga.</p>
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
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line bg-cream/30 flex flex-col sm:flex-row gap-4">
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
          <div className="relative w-full sm:w-64">
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

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Urutan</th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Satuan</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                // sort by urutan before mapping
                filteredProducts.sort((a,b) => a.urutan - b.urutan).map((p) => (
                  <tr key={p.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 text-muted">{p.urutan}</td>
                    <td className="px-6 py-4 font-medium text-ink">{p.kode}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{p.nama}</td>
                    <td className="px-6 py-4 text-ink/80">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{p.kategori || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span>{p.satuan}</span>
                        {p.satuan_perlu_konfirmasi && (
                          <span title="Satuan perlu konfirmasi" className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink font-medium">{formatRupiah(p.harga)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(p)} className="p-1.5 text-muted hover:text-richisam-orange hover:bg-orange-50 rounded-md transition-colors">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data produk.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  <input type="text" required value={formData.kode} onChange={e => setFormData({...formData, kode: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Urutan</label>
                  <input type="number" required value={formData.urutan} onChange={e => setFormData({...formData, urutan: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Nama Produk</label>
                <input type="text" required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Kategori</label>
                  <input type="text" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Satuan</label>
                  <input type="text" required value={formData.satuan} onChange={e => setFormData({...formData, satuan: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Harga (Per Satuan Terkecil)</label>
                <input type="number" step="0.01" required value={formData.harga} onChange={e => setFormData({...formData, harga: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none transition-all"/>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="satuanConfirm" checked={formData.satuan_perlu_konfirmasi} onChange={e => setFormData({...formData, satuan_perlu_konfirmasi: e.target.checked})} className="w-4 h-4 text-richisam-orange focus:ring-richisam-orange rounded border-line cursor-pointer"/>
                <label htmlFor="satuanConfirm" className="text-sm text-ink cursor-pointer">Satuan Perlu Dikonfirmasi</label>
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
