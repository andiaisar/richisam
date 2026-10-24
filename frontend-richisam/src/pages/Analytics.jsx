import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { LineChart, Search, Box, TrendingUp, AlertTriangle, ChevronRight, Activity, Zap, BarChart3 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import VisualChartsSection from '../components/VisualChartsSection';

const Analytics = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('abc'); // 'abc' or 'forecast'
  
  // Data State
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  
  // ABC State
  const [abcData, setAbcData] = useState([]);
  const [abcSummary, setAbcSummary] = useState(null);
  const [abcLoading, setAbcLoading] = useState(false);
  const [abcSearch, setAbcSearch] = useState('');

  // Forecast State
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

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
        } catch (e) {}
      };
      fetchOutlets();
    } else {
      setSelectedOutlet(user.outlet_id?.toString() || '');
    }

    const fetchProducts = async () => {
      try {
        const res = await axiosClient.get('/products');
        const list = res?.data?.data || res?.data || [];
        setProducts(list);
        if (list.length > 0) {
          setSelectedProduct(prev => prev || list[0].id.toString());
        }
      } catch (e) {}
    };
    fetchProducts();
  }, [user]);

  // Fetch ABC Data
  useEffect(() => {
    const fetchABC = async () => {
      if (!selectedOutlet) return;
      try {
        setAbcLoading(true);
        const res = await axiosClient.get('/analytics/abc-analysis', {
          params: { outlet_id: selectedOutlet }
        });
        setAbcData(res?.data || []);
        setAbcSummary(res?.summary || null);
      } catch (e) {
        toast.error('Gagal mengambil data klasifikasi ABC');
      } finally {
        setAbcLoading(false);
      }
    };
    if (activeTab === 'abc') {
      fetchABC();
    }
  }, [selectedOutlet, activeTab]);

  // Fetch Forecast Data
  useEffect(() => {
    const fetchForecast = async () => {
      if (!selectedOutlet || !selectedProduct) return;
      try {
        setForecastLoading(true);
        const res = await axiosClient.get('/analytics/forecast', {
          params: { outlet_id: selectedOutlet, product_id: selectedProduct, history_days: 14 }
        });
        setForecastData(res);
      } catch (e) {
        toast.error('Gagal memuat prediksi');
      } finally {
        setForecastLoading(false);
      }
    };
    if (activeTab === 'forecast' && selectedProduct) {
      fetchForecast();
    }
  }, [selectedOutlet, selectedProduct, activeTab]);

  const filteredAbc = abcData.filter(item => 
    item.nama.toLowerCase().includes(abcSearch.toLowerCase()) || 
    item.kode.toLowerCase().includes(abcSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <LineChart className="h-6 w-6 text-richisam-orange" />
            Analitik & Prediksi (DSS)
          </h1>
          <p className="mt-1 text-sm text-muted">Keputusan berbasis data untuk efisiensi persediaan gudang.</p>
        </div>
        
        {user?.role !== 'STAF_CABANG' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted">Cabang:</label>
            <select 
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-white dark:bg-[#1A1412] border border-line text-ink dark:text-white text-sm rounded-lg focus:ring-richisam-orange focus:border-richisam-orange block p-2.5 shadow-sm"
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.nama}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex space-x-1 p-1.5 bg-cream/60 dark:bg-[#1A1412] rounded-xl border border-line overflow-x-auto">
        <button
          onClick={() => setActiveTab('abc')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'abc' ? 'bg-richisam-orange text-white shadow-md' : 'text-stone-600 dark:text-stone-400 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Box size={18} /> Klasifikasi Kelas ABC
        </button>
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'forecast' ? 'bg-richisam-orange text-white shadow-md' : 'text-stone-600 dark:text-stone-400 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <TrendingUp size={18} /> Prediksi Kebutuhan (Forecasting)
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'charts' ? 'bg-richisam-orange text-white shadow-md' : 'text-stone-600 dark:text-stone-400 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <BarChart3 size={18} /> Visual Analytics & Grafik Tren
        </button>
      </div>

      {activeTab === 'abc' && (
        <div className="space-y-6">
          {/* ABC Summary Cards */}
          {abcSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1A1412] border border-line rounded-2xl p-5 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity size={80} />
                </div>
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Total Nilai Persediaan</p>
                <h3 className="text-2xl font-black text-ink dark:text-white">Rp {abcSummary.total_nilai.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 font-medium">Dari 30 Hari Terakhir</p>
              </div>
              <div className="bg-white dark:bg-[#1A1412] border border-emerald-500/30 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-1">Kelas A (Kritis)</p>
                <h3 className="text-2xl font-black text-ink dark:text-white">{abcSummary.kelas_A_count} Barang</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 font-medium">Fokuskan pengawasan di sini (80% Nilai)</p>
              </div>
              <div className="bg-white dark:bg-[#1A1412] border border-blue-500/30 dark:border-blue-900/50 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-500 uppercase tracking-wider mb-1">Kelas B (Moderat)</p>
                <h3 className="text-2xl font-black text-ink dark:text-white">{abcSummary.kelas_B_count} Barang</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 font-medium">Evaluasi rutin (15% Nilai)</p>
              </div>
              <div className="bg-white dark:bg-[#1A1412] border border-line rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">Kelas C (Rendah)</p>
                <h3 className="text-2xl font-black text-ink dark:text-white">{abcSummary.kelas_C_count} Barang</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 font-medium">Pengawasan minimal (5% Nilai)</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#1A1412] border border-line rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-line flex flex-col sm:flex-row justify-between gap-4 items-center">
              <h2 className="text-lg font-bold text-ink dark:text-white">Daftar Peringkat Barang</h2>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari barang..."
                  value={abcSearch}
                  onChange={(e) => setAbcSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-cream/40 dark:bg-[#140F0D] border border-line rounded-xl text-sm focus:ring-richisam-orange focus:border-richisam-orange text-ink dark:text-white"
                />
                <Search className="absolute left-3 top-2.5 text-muted" size={18} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-cream/60 dark:bg-[#16110F] text-stone-700 dark:text-stone-400 border-b border-line">
                  <tr>
                    <th className="px-6 py-4 font-bold">Peringkat</th>
                    <th className="px-6 py-4 font-bold">Barang</th>
                    <th className="px-6 py-4 font-bold text-right">Total Keluar (30h)</th>
                    <th className="px-6 py-4 font-bold text-right">Nilai Rupiah</th>
                    <th className="px-6 py-4 font-bold text-center">% Kumulatif</th>
                    <th className="px-6 py-4 font-bold text-center">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {abcLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted">
                        <Activity className="animate-spin inline-block mr-2" size={18} />
                        Menganalisis data...
                      </td>
                    </tr>
                  ) : filteredAbc.length > 0 ? (
                    filteredAbc.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-cream/40 dark:hover:bg-[#1C1714] transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-700 dark:text-stone-300">#{idx + 1}</td>
                        <td className="px-6 py-4 font-semibold text-ink dark:text-white">
                          {item.nama}
                          <p className="text-xs text-stone-600 dark:text-stone-400 font-normal mt-0.5">{item.kode} • Rp {parseFloat(item.harga).toLocaleString('id-ID')}/{item.satuan}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-stone-800 dark:text-stone-300">{item.total_keluar} {item.satuan}</td>
                        <td className="px-6 py-4 text-right font-bold text-richisam-orange">Rp {item.total_nilai.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-center text-stone-700 dark:text-stone-400 font-medium">{item.kumulatif.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm border ${
                            item.kelas === 'A' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50' :
                            item.kelas === 'B' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700/50' :
                            'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                          }`}>
                            {item.kelas}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted">Tidak ada data pemakaian untuk dianalisis.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A1412] border border-line rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-ink dark:text-stone-300 mb-2">Pilih Barang untuk Diprediksi</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-cream/30 dark:bg-[#140F0D] border border-line text-ink dark:text-white text-sm rounded-xl focus:ring-richisam-orange focus:border-richisam-orange block p-3 font-medium"
              >
                <option value="">-- Pilih Barang --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
                ))}
              </select>
            </div>
          </div>

          {!selectedProduct ? (
            <div className="bg-white dark:bg-[#140F0D] border border-dashed border-line rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
              <Zap size={48} className="text-stone-400 dark:text-stone-700 mb-4" />
              <h3 className="text-xl font-bold text-ink dark:text-stone-300 mb-2">Pilih Barang Dulu</h3>
              <p className="text-muted max-w-sm">Sistem akan membaca tren historis mutasi keluar untuk memberikan rekomendasi persediaan yang akurat.</p>
            </div>
          ) : forecastLoading ? (
            <div className="bg-white dark:bg-[#140F0D] border border-line rounded-2xl p-16 flex flex-col items-center justify-center shadow-sm">
              <Activity size={32} className="text-richisam-orange animate-spin mb-3" />
              <p className="text-stone-700 dark:text-stone-400 font-medium">Menghitung model forecasting (WMA)...</p>
            </div>
          ) : forecastData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1A1412] border border-richisam-orange/40 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <TrendingUp size={100} className="text-richisam-orange" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                    <Zap size={16} className="text-richisam-orange" />
                  </div>
                  <h3 className="text-lg font-bold text-ink dark:text-white">Rekomendasi Restock</h3>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-stone-600 dark:text-stone-400 font-semibold mb-1">Prediksi Pemakaian 1 Hari Ke Depan</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-ink dark:text-white">{forecastData.wma_1_hari}</span>
                    <span className="text-stone-600 dark:text-stone-400 font-semibold mb-1 border-b border-stone-300 dark:border-stone-700 pb-1">satuan/hari</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 font-semibold mb-1">Estimasi Kebutuhan Seminggu (7 Hari)</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-richisam-orange">{forecastData.wma_7_hari}</span>
                    <span className="text-stone-600 dark:text-stone-400 font-semibold mb-1">satuan</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 dark:bg-orange-950/20 border border-amber-300/80 dark:border-orange-900/30 rounded-xl flex gap-3 shadow-sm">
                  <AlertTriangle size={20} className="text-[#F9610D] shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-950 dark:text-orange-200/90 leading-relaxed font-medium">
                    Sistem menggunakan metode <strong className="font-bold text-amber-950 dark:text-white">Weighted Moving Average (WMA)</strong> berdasarkan tren aktual {forecastData.history_used} hari ke belakang. Bobot lebih besar diberikan pada tren hari-hari terakhir.
                  </p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-[#1A1412] border border-line rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-ink dark:text-white mb-4">Riwayat Tren Aktual (7 Hari Terakhir)</h3>
                <div className="space-y-3">
                  {forecastData.chartData && forecastData.chartData.length > 0 ? (
                    forecastData.chartData.map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-cream/40 dark:bg-[#140F0D] border border-line">
                        <span className="text-stone-700 dark:text-stone-400 font-bold text-sm">{d.tanggal}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-ink dark:text-white font-extrabold">{d.actual} Keluar</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-stone-500">Belum ada data historis yang cukup.</div>
                  )}
                  
                  <div className="flex items-center justify-between p-3.5 mt-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 shadow-sm">
                    <span className="text-orange-800 dark:text-orange-400 font-black text-sm tracking-wide">PREDIKSI {forecastData.next_forecast_date}</span>
                    <span className="text-ink dark:text-white font-black text-lg">{forecastData.wma_1_hari} <span className="text-xs text-stone-600 dark:text-stone-400 font-semibold">Keluar</span></span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: VISUAL CHARTS & TREN OPERASIONAL */}
      {activeTab === 'charts' && (
        <VisualChartsSection 
          initialOutletId={selectedOutlet} 
          title="Visual Analytics Lanjutan"
          subtitle={`Analisis grafik tren pemakaian harian, perputaran stok, dan arus logistik cabang`}
        />
      )}
    </div>
  );
};

export default Analytics;
