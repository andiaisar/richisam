import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { FileBarChart, Download, Calendar, Store, Table2, FileSpreadsheet } from 'lucide-react';
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
          const list = res?.data?.data || res?.data || [];
          setOutlets(list);
          if (list.length > 0) {
            setSelectedOutlet(list[0].id.toString());
          }
        } catch (e) {
          console.error('Error fetching outlets', e);
        }
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
      
      const blob = res instanceof Blob ? res : new Blob([res?.data || res]);
      const url = window.URL.createObjectURL(blob);
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

      const blob = res instanceof Blob ? res : new Blob([res?.data || res]);
      const url = window.URL.createObjectURL(blob);
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
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12 text-white">
      {/* ── HEADER TITLE & SUBTITLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F9610D]/15 text-[#F9610D] border border-[#F9610D]/30 text-[10px] font-bold uppercase tracking-wider">
              Modul Rekapitulasi & Dokumen
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1A1412] border border-[#2D241E] text-xs font-medium text-stone-300">
              <FileSpreadsheet size={13} className="text-emerald-400" />
              Format Excel (.xlsx)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight flex items-center gap-2.5">
            <FileBarChart className="text-[#F9610D]" size={28} />
            Ekspor Laporan Inventaris
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Unduh rekonsiliasi mutasi persediaan, format bulanan mitra 31 sheet, dan data mentah pergerakan stok.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ── KARTU 1: FORMAT BULANAN MITRA (31 SHEET) ── */}
        <div className="bg-[#1A1412] border border-[#2D241E] hover:border-[#F9610D]/40 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all">
          <div>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F9610D]/20 text-[#F9610D] border border-[#F9610D]/35 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                    Format Standar
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Format Spreadsheet Mitra (31 Sheet)</h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Struktur rekonsiliasi mutasi lengkap 31 tanggal per bulan sesuai template pembukuan resmi operasional Richisam.
                </p>
              </div>
              <div className="p-3 bg-[#F9610D]/10 rounded-2xl text-[#F9610D] border border-[#F9610D]/20 shrink-0">
                <Table2 size={24} />
              </div>
            </div>
            
            <div className="space-y-4">
              {user?.role !== 'STAF_CABANG' && (
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                    <Store size={13} className="text-[#F9610D]" /> Cabang Restoran
                  </label>
                  <select 
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                    className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D]"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">Bulan</label>
                  <select 
                    value={bulan}
                    onChange={(e) => setBulan(e.target.value)}
                    className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D]"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">Tahun</label>
                  <input 
                    type="number" 
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    min="2020" max="2100"
                    className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D]"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleMitraExport}
            disabled={mitraLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#F9610D] to-[#BA4F18] hover:from-[#e55307] hover:to-[#a83d0d] disabled:opacity-50 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-xl shadow-[#F9610D]/25 mt-6 cursor-pointer"
          >
            {mitraLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                <span>Menyiapkan Spreadsheet 31 Sheet...</span>
              </div>
            ) : (
              <>
                <Download size={17} />
                Unduh Format Mitra Bulanan
              </>
            )}
          </button>
        </div>

        {/* ── KARTU 2: EXPORT CUSTOM (RENTANG TANGGAL - DATA MENTAH) ── */}
        <div className="bg-[#1A1412] border border-[#2D241E] hover:border-[#FFCE00]/40 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all">
          <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#FFCE00]/10 blur-3xl group-hover:scale-125 transition-transform" />
          
          <div>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFCE00]/15 text-[#FFCE00] border border-[#FFCE00]/30 text-[10px] font-extrabold uppercase tracking-wide">
                    Ekspor Kustom
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Export Excel (Data Mentah)</h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Ekspor pergerakan mutasi stok mentah (*raw data*) berdasarkan rentang tanggal tertentu yang Anda tentukan.
                </p>
              </div>
              <div className="p-3 bg-[#FFCE00]/10 rounded-2xl text-[#FFCE00] border border-[#FFCE00]/20 shrink-0">
                <Download size={24} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#FFCE00]" /> Tanggal Mulai
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#FFCE00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#FFCE00]" /> Tanggal Akhir
                </label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#FFCE00]"
                />
              </div>
            </div>
          </div>
          
          {/* Tombol Unduh Excel Mentah dengan kontras tinggi dan teks putih terang terbaca jelas */}
          <button 
            onClick={handleCustomExport}
            disabled={customLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#251D18] hover:bg-[#342720] border border-[#3E3027] hover:border-[#FFCE00]/60 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-[#FFCE00]/10 mt-6 cursor-pointer disabled:opacity-50"
          >
            {customLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                <span className="text-white">Mengekspor Data...</span>
              </div>
            ) : (
              <>
                <Download size={17} className="text-[#FFCE00]" />
                <span className="text-white font-black tracking-wide">Unduh Excel Mentah</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Laporan;
