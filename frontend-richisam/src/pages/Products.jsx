import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Package, Search, Plus, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/products');
      setProducts(res.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Package className="h-6 w-6 text-richisam-orange" />
            Manajemen Produk
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola master data produk dan kategori.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchProducts}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} />
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text" 
              placeholder="Cari kode atau nama produk..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Satuan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{p.kode}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{p.nama}</td>
                    <td className="px-6 py-4 text-ink/80">{p.kategori || '-'}</td>
                    <td className="px-6 py-4 text-ink/80">{p.satuan}</td>
                    <td className="px-6 py-4">
                      {p.is_active ? (
                        <span className="text-green-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>Aktif</span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">Edit</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data produk.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Products;
