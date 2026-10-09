import useAuthStore from '../store/useAuthStore';
import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Gauge, Search, Plus, RefreshCw, FileText, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ParStock = () => {
  const { user } = useAuthStore();
  const [parStocks, setParStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOutletId, setModalOutletId] = useState('');
  const [formItems, setFormItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [psRes, outRes, prodRes] = await Promise.all([
        axiosClient.get('/par-stocks'),
        axiosClient.get('/outlets'),
        axiosClient.get('/products?limit=1000') // Get all products
      ]);
      setParStocks(psRes?.data?.data || psRes?.data || []);
      setOutlets(outRes?.data?.data || outRes?.data || []);
      setProducts(prodRes?.data?.data || prodRes?.data || []); // Handle product pagination format
    } catch (e) {
      toast.error('Gagal mengambil data par stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setModalOutletId('');
    setFormItems([]);
    setIsModalOpen(true);
  };
  
  const handleOutletSelect = async (e) => {
    const oid = e.target.value;
    setModalOutletId(oid);
    if (!oid) {
      setFormItems([]);
      return;
    }
    
    // Fetch existing par stocks for this outlet to prefill
    try {
      const res = await axiosClient.get(`/par-stocks?outlet_id=${oid}`);
      const existing = res?.data?.data || res?.data || [];
      
      const items = products.map(p => {
        const exist = existing.find(ex => ex.product_id === p.id);
        return {
          product_id: p.id,
          nama: p.nama,
          min_qty: exist ? exist.min_qty : 0
        };
      });
      setFormItems(items);
    } catch (err) {
      toast.error('Gagal memuat par stock outlet ini');
    }
  };

  const handleQtyChange = (productId, val) => {
    const num = parseInt(val) || 0;
    setFormItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, min_qty: num >= 0 ? num : 0 } : item
    ));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!modalOutletId) return toast.error('Pilih cabang terlebih dahulu');
    
    // Only send items with min_qty > 0 or items that had existing par stocks that need to be reset to 0
    const updates = formItems.map(item => ({
      product_id: item.product_id,
      min_qty: item.min_qty
    }));
    
    if (updates.length === 0) return toast.error('Tidak ada data produk');

    setSaving(true);
    try {
      await axiosClient.put('/par-stocks', {
        outlet_id: parseInt(modalOutletId),
        updates
      });
      toast.success('Par stock berhasil diperbarui');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan par stock');
    } finally {
      setSaving(false);
    }
  };

  const filteredParStocks = parStocks.filter(ps => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ps.product_name?.toLowerCase().includes(q) || 
           ps.outlet_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Gauge className="h-6 w-6 text-richisam-orange" />
            Pengaturan Par Stock
          </h1>
          <p className="mt-1 text-sm text-muted">Atur batas stok minimum per produk untuk masing-masing cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role !== 'OWNER' && (
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Atur Par Stock
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk atau cabang..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4">Batas Minimum (Qty)</th>
                <th className="px-6 py-4">Terakhir Diubah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredParStocks.length > 0 ? (
                filteredParStocks.map((ps) => (
                  <tr key={ps.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{ps.outlet_name}</td>
                    <td className="px-6 py-4 text-ink">{ps.product_name}</td>
                    <td className="px-6 py-4 font-bold text-ink">{ps.min_qty}</td>
                    <td className="px-6 py-4 text-muted">{new Date(ps.updated_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada pengaturan par stock.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Form Par Stock */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30 shrink-0">
              <h2 className="font-bold text-ink text-lg">Atur Par Stock</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-5 border-b border-line shrink-0">
                <label className="block text-sm font-medium text-ink mb-1">Pilih Cabang</label>
                <select 
                  required 
                  value={modalOutletId} 
                  onChange={handleOutletSelect} 
                  className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange"
                >
                  <option value="">-- Pilih Outlet --</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
                {modalOutletId ? (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-12 gap-4 px-3 pb-2 text-xs font-bold text-muted uppercase tracking-wider border-b border-line">
                      <div className="col-span-8">Nama Produk</div>
                      <div className="col-span-4 text-right">Qty Minimum</div>
                    </div>
                    {formItems.map(item => (
                      <div key={item.product_id} className="grid grid-cols-12 gap-4 items-center p-3 bg-white border border-line rounded-xl shadow-sm">
                        <div className="col-span-8 font-medium text-sm text-ink truncate" title={item.nama}>
                          {item.nama}
                        </div>
                        <div className="col-span-4">
                          <input 
                            type="number" 
                            min="0"
                            required
                            value={item.min_qty === 0 || item.min_qty == null ? '' : item.min_qty}
                            placeholder="0"
                            onChange={e => handleQtyChange(item.product_id, e.target.value)}
                            className="w-full px-3 py-1.5 text-right text-sm font-bold border border-line rounded-lg focus:outline-none focus:border-richisam-orange focus:ring-1 focus:ring-richisam-orange"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted">
                    Silakan pilih cabang terlebih dahulu
                  </div>
                )}
              </div>
              
              <div className="p-4 flex justify-end gap-3 border-t border-line bg-white shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={saving || !modalOutletId} className="px-5 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ParStock;
