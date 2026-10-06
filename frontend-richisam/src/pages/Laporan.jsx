import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Laporan = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih rentang tanggal terlebih dahulu');
      return;
    }
    try {
      setLoading(true);
      const res = await axiosClient.get(`/reports/export-mutations`, {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Mutasi_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Laporan berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh laporan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-richisam-orange" />
          Laporan & Ekspor
        </h1>
        <p className="mt-1 text-sm text-muted">Unduh laporan pergerakan stok, defect, dan operasional lainnya.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Laporan Mutasi Stok</h3>
              <p className="text-sm text-muted mt-1">Ekspor data pergerakan stok harian ke format Excel.</p>
            </div>
            <div className="p-3 bg-cream rounded-xl text-ink">
              <Download size={20} />
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
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] disabled:bg-richisam-orange/50 text-white rounded-lg font-medium transition-colors shadow-sm mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <Download size={18} />
                  Unduh Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Laporan lainnya bisa ditambahkan di sini (misal: Laporan Defect) */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Laporan Defect</h3>
              <p className="text-sm text-muted mt-1">Ekspor rekap laporan defect (Segera Hadir).</p>
            </div>
            <div className="p-3 bg-cream rounded-xl text-ink">
              <FileBarChart size={20} />
            </div>
          </div>
          <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sand text-muted rounded-lg font-medium cursor-not-allowed mt-auto">
            Belum Tersedia
          </button>
        </div>
      </div>
    </div>
  );
};
export default Laporan;
