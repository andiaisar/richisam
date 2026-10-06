import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { PackageX, Search, Plus, Filter, RefreshCw, FileText, Image as ImageIcon } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Defect = () => {
  const { user } = useAuthStore();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchDefects = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/defects${filter !== 'ALL' ? `?status=${filter}` : ''}`);
      setDefects(res.data?.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data defect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [filter]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <PackageX className="h-6 w-6 text-richisam-orange" />
            Laporan Defect
          </h1>
          <p className="mt-1 text-sm text-muted">Daftar laporan barang rusak atau cacat dari cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDefects}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role === 'STAF_CABANG' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Buat Laporan
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
              placeholder="Cari produk atau keterangan..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white border border-line rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
            >
              <option value="ALL">Semua Status</option>
              <option value="BARU">Baru</option>
              <option value="DITINJAU">Ditinjau</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Produk</th>
                {user?.role !== 'STAF_CABANG' && <th className="px-6 py-4">Cabang</th>}
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4 max-w-[200px]">Keterangan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dilaporkan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
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
              ) : defects.length > 0 ? (
                defects.map((d) => (
                  <tr key={d.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4">
                      {d.foto_url ? (
                        <img 
                          src={`http://localhost:5000${d.foto_url}`} 
                          alt="Defect" 
                          className="h-10 w-10 rounded-md object-cover border border-line"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-cream flex items-center justify-center border border-line text-muted">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">{d.product_name}</td>
                    {user?.role !== 'STAF_CABANG' && <td className="px-6 py-4 text-ink/80">{d.outlet_name}</td>}
                    <td className="px-6 py-4 font-semibold text-ink">{d.qty}</td>
                    <td className="px-6 py-4 text-ink/70 truncate max-w-[200px]" title={d.keterangan}>
                      {d.keterangan || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4 text-muted">{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">
                        Detail
                      </button>
                    </td>
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
                      <p className="text-sm text-muted">Belum ada laporan defect yang sesuai.</p>
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

const StatusBadge = ({ status }) => {
  const styles = {
    'BARU': 'bg-red-50 text-red-700 border-red-200',
    'DITINJAU': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'SELESAI': 'bg-green-50 text-green-700 border-green-200',
  };
  
  const className = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  
  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border uppercase ${className}`}>
      {status}
    </span>
  );
};

export default Defect;
