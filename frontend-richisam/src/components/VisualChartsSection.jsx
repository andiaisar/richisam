import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  LineChart as LineChartIcon, PieChart as PieChartIcon, 
  BarChart3, ArrowUpDown, RefreshCw, Sparkles, Filter, Store, Calendar
} from 'lucide-react';

// Custom Tooltip Elegan (Luxury Dark Theme)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#140F0D] border border-[#2D241E] p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-bold text-stone-200 border-b border-[#241C18] pb-1 font-mono">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-stone-400 capitalize">{entry.name}:</span>
            </div>
            <span className="font-extrabold text-white font-mono">
              {entry.value?.toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const VisualChartsSection = ({ initialOutletId = null, title = "Visual Analytics & Tren Inventaris", subtitle = "Grafik interaktif analisis pemakaian harian, perputaran stok, dan arus logistik cabang" }) => {
  const [data, setData] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(initialOutletId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const res = await axiosClient.get('/outlets');
      setOutlets(res?.data?.data || res?.data || []);
    } catch (e) {
      console.error('Error fetching outlets:', e);
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      let url = '/analytics/visual-charts';
      if (selectedOutlet) url += `?outlet_id=${selectedOutlet}`;
      const res = await axiosClient.get(url);
      setData(res?.data?.data || res?.data || null);
    } catch (e) {
      console.error('Error fetching visual chart data:', e);
    } finally {
      setLoading(false);
    }
  };

  const dailyTrends = data?.daily_usage_trend || [];
  const topProducts = data?.top_products || [];
  const categoryDist = data?.category_distribution || [];
  const branchComparison = data?.branch_comparison || [];

  // Extract keys for dynamic area chart lines
  const trendKeys = dailyTrends.length > 0
    ? Object.keys(dailyTrends[0]).filter(k => k !== 'tanggal' && k !== 'rawDate')
    : [];

  const trendColors = ['#F9610D', '#FFCE00', '#10B981', '#6366F1'];

  return (
    <section className="space-y-6 animate-fade-in text-white">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1A1412] p-5 sm:p-6 rounded-3xl border border-[#2D241E] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#F9610D]/20 text-[#F9610D] border border-[#F9610D]/30">
              <LineChartIcon size={16} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFCE00]">
              Pilar Visual Analytics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {outlets.length > 0 && (
            <div className="flex items-center gap-2 bg-[#130E0C] border border-[#2D241E] px-3 py-1.5 rounded-xl">
              <Store size={14} className="text-stone-400" />
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#140F0D]">Seluruh Cabang (Konsolidasi)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id} className="bg-[#140F0D]">{o.nama}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchChartData}
            className="p-2.5 bg-[#130E0C] border border-[#2D241E] hover:border-stone-500 rounded-xl text-stone-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Grafik"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center rounded-3xl bg-[#1A1412] border border-[#2D241E]">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-3" />
          <p className="text-xs text-stone-400 font-semibold">Menyiapkan visualisasi data analitik...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── GRAFIK 1: Tren Konsumsi Harian Bahan Baku Utama (Area Chart) ── */}
          <div className="lg:col-span-2 rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F9610D]/15 flex items-center justify-center text-[#F9610D] border border-[#F9610D]/30">
                    <LineChartIcon size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">Tren Pemakaian Harian (Usage Trend)</h3>
                    <p className="text-[11px] text-stone-400">Fluktuasi konsumsi bahan baku utama per hari operasional</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#130E0C] border border-[#2D241E] text-[10px] font-bold text-stone-300">
                  <Sparkles size={11} className="text-[#FFCE00]" />
                  <span>Realtime Feed</span>
                </div>
              </div>

              {/* Chart Body */}
              <div className="h-72 w-full mt-4">
                {dailyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {trendKeys.map((key, idx) => {
                          const col = trendColors[idx % trendColors.length];
                          return (
                            <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={col} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={col} stopOpacity={0.0} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#241C18" vertical={false} />
                      <XAxis 
                        dataKey="tanggal" 
                        stroke="#6B5E57" 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={{ stroke: '#2D241E' }}
                      />
                      <YAxis 
                        stroke="#6B5E57" 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px', fontSize: '11px', textTransform: 'capitalize' }} 
                        formatter={(val) => <span className="text-stone-300 font-semibold">{val}</span>}
                      />
                      {trendKeys.map((key, idx) => {
                        const col = trendColors[idx % trendColors.length];
                        return (
                          <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={col}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#grad-${key})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    Belum ada riwayat mutasi untuk rentang tanggal ini.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#241C18] flex items-center justify-between text-[11px] text-stone-400">
              <span>Sumbu Horizontal: Waktu Operasional</span>
              <span className="text-[#F9610D] font-bold">Satuan Pemakaian (Pcs / Kg)</span>
            </div>
          </div>

          {/* ── GRAFIK 2: Komposisi Kategori Persediaan (Donut Chart) ── */}
          <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFCE00]/15 flex items-center justify-center text-[#FFCE00] border border-[#FFCE00]/30">
                    <PieChartIcon size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">Komposisi Kategori</h3>
                    <p className="text-[11px] text-stone-400">Distribusi varian katalog bahan</p>
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="h-60 w-full mt-3 relative">
                {categoryDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="total_item"
                      >
                        {categoryDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#1A1412" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#140F0D] border border-[#2D241E] p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-bold text-white">{d.name}</p>
                                <p className="text-stone-300">{d.total_item} Varian Produk</p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    Tidak ada data kategori.
                  </div>
                )}
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-stone-400 font-semibold">Total Item</span>
                  <span className="text-xl font-black text-white">
                    {categoryDist.reduce((acc, c) => acc + c.total_item, 0)}
                  </span>
                </div>
              </div>

              {/* Custom Legend Pill List */}
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {categoryDist.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-[#140F0D]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-stone-300 truncate">{cat.name}</span>
                    </div>
                    <span className="font-bold text-white font-mono">{cat.total_item} Item</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#241C18] text-[11px] text-stone-500 text-center">
              Katalog Master Produk Aktif
            </div>
          </div>

          {/* ── GRAFIK 3: Top 5 Fast Moving Products (Bar Chart Horizontal) ── */}
          <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">5 Bahan Fast-Moving</h3>
                    <p className="text-[11px] text-stone-400">Bahan dengan tingkat perputaran (rotasi) tertinggi</p>
                  </div>
                </div>
              </div>

              {/* Horizontal Bar Chart */}
              <div className="h-64 w-full mt-4">
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topProducts.map(p => ({
                        ...p,
                        shortName: p.nama.length > 13 ? p.nama.substring(0, 12) + '..' : p.nama
                      }))}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#241C18" horizontal={false} />
                      <XAxis type="number" stroke="#6B5E57" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="shortName" 
                        stroke="#9CA3AF" 
                        fontSize={11} 
                        axisLine={false} 
                        tickLine={false} 
                        width={90}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="qty" fill="#F9610D" radius={[0, 8, 8, 0]}>
                        {topProducts.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? '#F9610D' : index === 1 ? '#FFCE00' : index === 2 ? '#10B981' : '#6366F1'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    Tidak ada data mutasi keluar.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#241C18] text-[11px] text-stone-400 flex justify-between">
              <span>Prioritas Pengadaan</span>
              <span className="text-[#FFCE00] font-bold">Frekuensi Tertinggi</span>
            </div>
          </div>

          {/* ── GRAFIK 4: Arus Masuk vs Keluar per Cabang (Bar Chart) ── */}
          <div className="lg:col-span-2 rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#241C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                    <ArrowUpDown size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">Arus Logistik Cabang (Barang Masuk vs Keluar)</h3>
                    <p className="text-[11px] text-stone-400">Keseimbangan suplai kiriman vs pemakaian dapur di tiap cabang</p>
                  </div>
                </div>
              </div>

              {/* In vs Out Bar Chart */}
              <div className="h-64 w-full mt-4">
                {branchComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#241C18" vertical={false} />
                      <XAxis dataKey="cabang" stroke="#6B5E57" fontSize={11} tickLine={false} axisLine={{ stroke: '#2D241E' }} />
                      <YAxis stroke="#6B5E57" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} 
                        formatter={(val) => <span className="text-stone-300 font-semibold">{val === 'masuk' ? 'Barang Masuk (Suplai)' : 'Barang Keluar (Konsumsi)'}</span>}
                      />
                      <Bar dataKey="masuk" fill="#10B981" radius={[6, 6, 0, 0]} name="masuk" />
                      <Bar dataKey="keluar" fill="#EC1F27" radius={[6, 6, 0, 0]} name="keluar" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    Belum ada data perbandingan cabang.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#241C18] text-[11px] text-stone-400 flex items-center justify-between">
              <span>Hijau: Kiriman Suplai Masuk</span>
              <span className="text-red-400 font-semibold">Merah: Bahan Dipakai / Keluar</span>
            </div>
          </div>

        </div>
      )}
    </section>
  );
};

export default VisualChartsSection;
