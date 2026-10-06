import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { ArrowLeftRight, Search, Plus, Filter, RefreshCw, FileText } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Mutasi = () => {
  const { user } = useAuthStore();
  const [mutations, setMutations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMutations = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/mutations`);
      setMutations(res.data?.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data mutasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMutations();
  }, []);

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
            <button className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
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
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-richisam-orange"></div>
                      Memuat data...
                    </div>
                  </td>
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
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-cream flex items-center justify-center text-muted">
                        <FileText size={24} />
                      </div>
                      <p className="font-semibold text-ink">Tidak ada data</p>
                      <p className="text-sm text-muted">Belum ada catatan mutasi stok.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Mutasi;
