import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { PackageOpen, Save, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const OpeningBalance = () => {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState({});

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const res = await axiosClient.get('/outlets');
        setOutlets(res?.data?.data || res?.data || []);
      } catch (e) {
        toast.error('Gagal mengambil daftar outlet');
      }
    };
    fetchOutlets();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/products?limit=1000');
      const prodList = res?.data?.data || res?.data || [];
      // Sort by urutan
      prodList.sort((a,b) => (a.urutan || 0) - (b.urutan || 0));
      setProducts(prodList);
      
      const initialItems = {};
      prodList.forEach(p => {
        initialItems[p.id] = 0;
      });
      setItems(initialItems);
    } catch (e) {
      toast.error('Gagal mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOutlet) {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [selectedOutlet]);

  const handleQtyChange = (id, val) => {
    const num = parseInt(val) || 0;
    setItems(prev => ({ ...prev, [id]: num >= 0 ? num : 0 }));
  };

  const handleSave = async () => {
    if (!selectedOutlet) return toast.error('Pilih outlet terlebih dahulu');
    if (!tanggal) return toast.error('Tanggal wajib diisi');

    const itemsToSave = Object.keys(items).map(id => ({
      product_id: parseInt(id),
      qty: items[id]
    })).filter(i => i.qty >= 0); // Include 0 to initialize balances

    try {
      await axiosClient.post('/opening-balances', {
        outlet_id: parseInt(selectedOutlet),
        tanggal,
        items: itemsToSave
      });
      toast.success('Stok awal berhasil disimpan');
      // Optionally reset
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan stok awal');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-richisam-orange" />
            Stok Awal
          </h1>
          <p className="mt-1 text-sm text-muted">Input stok awal/Opening Balance per outlet.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={products.length === 0 || loading} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
            <Save size={18} />
            Simpan Massal
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={18} className="text-yellow-600" />
          <span className="text-sm text-yellow-800 font-medium">Stok awal hanya bisa diinput satu kali per produk-outlet.</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Pilih Outlet</label>
            <select 
              value={selectedOutlet} 
              onChange={e => setSelectedOutlet(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none bg-white appearance-none"
            >
              <option value="">-- Pilih Outlet --</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.nama}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Tanggal</label>
            <input 
              type="date" 
              value={tanggal} 
              onChange={e => setTanggal(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none bg-white"
            />
          </div>
        </div>

        {selectedOutlet && (
          <div className="mt-6 border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Satuan</th>
                  <th className="px-6 py-4 w-48">Qty Stok Awal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                      Memuat data...
                    </td>
                  </tr>
                ) : products.length > 0 ? (
                  products.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-cream/30 transition-colors group">
                      <td className="px-6 py-3 text-muted">{idx + 1}</td>
                      <td className="px-6 py-3 font-semibold text-ink">{p.nama}</td>
                      <td className="px-6 py-3 text-muted">{p.kategori || '-'}</td>
                      <td className="px-6 py-3 text-muted">{p.satuan}</td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          min="0"
                          value={items[p.id] || ''}
                          onChange={e => handleQtyChange(p.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-line rounded-lg focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange outline-none"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-muted">
                      <FileText size={24} className="mx-auto mb-2 opacity-50"/>
                      Tidak ada data produk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpeningBalance;
