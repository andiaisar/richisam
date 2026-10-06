import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { ArrowLeftRight, Search, Plus, Filter, RefreshCw, FileText, X } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Mutasi = () => {
  const { user } = useAuthStore();
  const [mutations, setMutations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ product_id: '', shift: 'PAGI', sumber_masuk: '', masuk: 0, keluar: 0 });
  const [submitting, setSubmitting] = useState(false);

  const fetchMutations = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/mutations`);
      setMutations(res.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data mutasi');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products');
      setProducts(res.data?.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMutations();
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id) {
      return toast.error('Silakan pilih produk');
    }
    setSubmitting(true);
    try {
      const payload = {
        tanggal: new Date().toISOString().split('T')[0],
        shift: formData.shift,
        items: [
          {
            product_id: parseInt(formData.product_id),
            masuk: parseInt(formData.masuk) || 0,
            keluar: parseInt(formData.keluar) || 0
          }
        ]
      };
      await axiosClient.post('/mutations', payload);
      toast.success('Mutasi stok berhasil dicatat');
      setIsModalOpen(false);
      setFormData({ product_id: '', shift: 'PAGI', sumber_masuk: '', masuk: 0, keluar: 0 });
      fetchMutations();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mencatat mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMutations = mutations
    .filter(m => shiftFilter === 'ALL' || m.shift === shiftFilter)
    .filter(m => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.product_name?.toLowerCase().includes(q) || m.outlet_name?.toLowerCase().includes(q);
    });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-richisam-orange" />
            Mutasi Stok Harian
          </h1>
          <p className="mt-1 text-sm text-muted">Laporan keluar masuk stok barang per shift.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchMutations}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role === 'STAF_CABANG' && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Input Mutasi
            </button>
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-4 justify-between items-center bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted" />
            <select 
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-white border border-line rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
            >
              <option value="ALL">Semua Shift</option>
              <option value="PAGI">Pagi</option>
              <option value="SORE">Sore</option>
              <option value="MIDNIGHT">Midnight</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Produk</th>
                {user?.role !== 'STAF_CABANG' && <th className="px-6 py-4">Cabang</th>}
                <th className="px-6 py-4 text-right">SAW</th>
                <th className="px-6 py-4 text-right text-green-600">Masuk</th>
                <th className="px-6 py-4 text-right text-red-600">Keluar</th>
                <th className="px-6 py-4 text-right">SAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredMutations.length > 0 ? (
                filteredMutations.map((m) => (
                  <tr key={m.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 text-ink">{new Date(m.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border uppercase bg-gray-50 border-gray-200 text-gray-700">
                        {m.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">{m.product_name}</td>
                    {user?.role !== 'STAF_CABANG' && <td className="px-6 py-4 text-ink/80">{m.outlet_name}</td>}
                    <td className="px-6 py-4 text-right font-medium">{m.saw}</td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">+{m.masuk}</td>
                    <td className="px-6 py-4 text-right text-red-600 font-medium">-{m.keluar}</td>
                    <td className="px-6 py-4 text-right font-bold text-ink">{m.sak}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data mutasi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Input Mutasi Stok</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Shift</label>
                <select required value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="PAGI">PAGI</option>
                  <option value="SORE">SORE</option>
                  <option value="MIDNIGHT">MIDNIGHT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Produk</label>
                <select required value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-ink mb-1">Stok Masuk</label>
                  <input type="number" min="0" value={formData.masuk} onChange={e => setFormData({...formData, masuk: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-ink mb-1">Stok Keluar</label>
                  <input type="number" min="0" value={formData.keluar} onChange={e => setFormData({...formData, keluar: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                </div>
              </div>
              {formData.masuk > 0 && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Sumber Masuk (Opsional)</label>
                  <input type="text" value={formData.sumber_masuk} onChange={e => setFormData({...formData, sumber_masuk: e.target.value})} placeholder="Misal: Dari Gudang A" className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                </div>
              )}
              
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mutasi;
