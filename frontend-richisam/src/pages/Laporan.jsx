import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { FileBarChart, Download, Calendar, Store, Table2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Laporan = () => {
  const { user } = useAuthStore();
  
  // Custom Export State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customLoading, setCustomLoading] = useState(false);

  // Mitra Format Export State
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [bulan, setBulan] = useState(new Date().getMonth() + 1); // 1-12
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [mitraLoading, setMitraLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'STAF_CABANG') {
      const fetchOutlets = async () => {
        try {
          const res = await axiosClient.get('/outlets');
          setOutlets(res.data?.data || []);
          if (res.data?.data?.length > 0) {
            setSelectedOutlet(res.data.data[0].id.toString());
          }
        } catch (e) {}
      };
      fetchOutlets();
    } else {
      setSelectedOutlet(user.outlet_id?.toString() || '');
    }
  }, [user]);

  const handleCustomExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih rentang tanggal terlebih dahulu');
      return;
    }
    try {
      setCustomLoading(true);
      const res = await axiosClient.get(`/reports/export/excel`, {
        params: { start_date: startDate, end_date: endDate, outlet_id: selectedOutlet },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Mutasi_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Laporan custom berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh laporan custom');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleMitraExport = async () => {
    if (!selectedOutlet) return toast.error('Pilih cabang terlebih dahulu');
    if (!bulan || !tahun) return toast.error('Pilih bulan dan tahun');

    try {
      setMitraLoading(true);
      const res = await axiosClient.get(`/reports/monthly/export`, {
        params: { outlet_id: selectedOutlet, bulan, tahun },
        responseType: 'blob',
      });
      
      const outletName = outlets.find(o => o.id.toString() === selectedOutlet.toString())?.nama || 'Outlet';
      const filename = `Laporan_Stok_${outletName}_${String(bulan).padStart(2, '0')}-${tahun}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Laporan Format Mitra berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh laporan format mitra');
    } finally {
      setMitraLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-richisam-orange" />
          Ekspor Laporan
        </h1>
        <p className="mt-1 text-sm text-muted">Unduh laporan mutasi dan persediaan ke dalam format Excel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mitra Format Card */}
        <div className="bg-white border-2 border-richisam-orange/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-richisam-orange/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
          
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-ink">Export Excel (Format Mitra)</h3>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wide">Rekomendasi</span>
              </div>
              <p className="text-sm text-muted">Unduh laporan bulanan sesuai dengan struktur spreadsheet 31 sheet asli.</p>
            </div>
            <div className="p-3 bg-richisam-orange/10 rounded-xl text-richisam-orange shrink-0">
              <Table2 size={24} />
            </div>
          </div>
          
          <div className="space-y-4">
            {user?.role !== 'STAF_CABANG' && (
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Cabang / Outlet</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <select 
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink mb-1">Bulan</label>
                <select 
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink mb-1">Tahun</label>
                <input 
                  type="number" 
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  min="2020" max="2100"
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
              </div>
            </div>
            
            <button 
              onClick={handleMitraExport}
              disabled={mitraLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-richisam-orange hover:bg-[#d9530a] disabled:bg-richisam-orange/50 text-white rounded-lg font-bold transition-colors shadow-sm mt-4"
            >
              {mitraLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <Download size={18} />
                  Download Format Mitra
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Range Card */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-ink">Export Custom (Rentang Tanggal)</h3>
              <p className="text-sm text-muted mt-1">Ekspor data pergerakan stok mentah berdasarkan tanggal tertentu.</p>
            </div>
            <div className="p-3 bg-cream rounded-xl text-ink shrink-0">
              <Download size={24} />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Tanggal Mulai</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Tanggal Akhir</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange"
                />
              </div>
            </div>
            
            <button 
              onClick={handleCustomExport}
              disabled={customLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink hover:bg-ink/90 disabled:bg-ink/50 text-white rounded-lg font-medium transition-colors shadow-sm mt-4"
            >
              {customLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <Download size={18} />
                  Unduh Excel Mentah
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Laporan;
