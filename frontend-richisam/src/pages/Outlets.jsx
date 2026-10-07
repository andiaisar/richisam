import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Store, Search, Plus, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const Outlets = () => {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/outlets');
      setOutlets(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data cabang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const filteredOutlets = outlets.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.nama?.toLowerCase().includes(q) || 
           o.alamat?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Store className="h-6 w-6 text-richisam-orange" />
            Manajemen Cabang
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola data cabang dan gudang pusat.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOutlets}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} />
            Tambah Cabang
          </button>
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
              placeholder="Cari nama cabang..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Nama Outlet</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredOutlets.length > 0 ? (
                filteredOutlets.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{o.nama}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border uppercase ${o.tipe === 'PUSAT' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {o.tipe}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink/80 truncate max-w-xs">{o.alamat || '-'}</td>
                    <td className="px-6 py-4">
                      {o.is_active ? (
                        <span className="text-green-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>Buka</span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Tutup</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">Edit</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data cabang.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Outlets;
