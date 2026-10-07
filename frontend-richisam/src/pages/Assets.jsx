import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Package, Search, RefreshCw, FileText, Wrench } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Assets = () => {
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOutlets = async () => {
    if (user?.role !== 'STAF_CABANG') {
      try {
        const res = await axiosClient.get('/outlets');
        setOutlets(res?.data?.data || res?.data || []);
        if (res?.data?.length > 0) {
          setSelectedOutlet(res.data.data[0].id.toString());
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

  const filteredAssets = assets.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.nama?.toLowerCase().includes(q) || a.kode?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Wrench className="h-6 w-6 text-richisam-orange" />
            Inventaris Peralatan
          </h1>
          <p className="mt-1 text-sm text-muted">Pantau jumlah dan kondisi aset non-habis pakai per cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAssets}
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
              placeholder="Cari nama peralatan..."
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
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredAssets.length > 0 ? (
                filteredAssets.map((a) => {
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
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data peralatan di cabang ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assets;
