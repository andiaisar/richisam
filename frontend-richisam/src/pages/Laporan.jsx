import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import {
  FileBarChart,
  Download,
  Calendar,
  Store,
  Table2,
  FileSpreadsheet,
  Search,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const Laporan = () => {
  const { user } = useAuthStore();
  const isBranchLocked = user?.role === 'STAF_CABANG' || user?.role === 'ADMIN_GUDANG';
  const defaultLockedOutlet = user?.outlet_id ? String(user.outlet_id) : (user?.role === 'ADMIN_GUDANG' ? '1' : '');

  // Filter State
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(isBranchLocked ? defaultLockedOutlet : '');
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  // Monthly Recap State (On-Screen Table & Summary)
  const [recapData, setRecapData] = useState(null);
  const [recapLoading, setRecapLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyActiveMovement, setOnlyActiveMovement] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Custom Export State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [mitraLoading, setMitraLoading] = useState(false);
  const [downloadingBranchId, setDownloadingBranchId] = useState(null);

  useEffect(() => {
    if (!isBranchLocked) {
      const fetchOutlets = async () => {
        try {
          const res = await axiosClient.get('/outlets');
          const list = res?.data?.data || res?.data || [];
          setOutlets(list);
        } catch (e) {
          console.error('Error fetching outlets', e);
        }
      };
      fetchOutlets();
    } else {
      setSelectedOutlet(defaultLockedOutlet);
    }
  }, [user, isBranchLocked, defaultLockedOutlet]);

  const fetchMonthlyRecap = async () => {
    try {
      setRecapLoading(true);
      const params = { bulan, tahun };
      const targetOutlet = isBranchLocked ? defaultLockedOutlet : selectedOutlet;
      if (targetOutlet) params.outlet_id = targetOutlet;

      try {
        const res = await axiosClient.get('/reports/monthly', { params });
        setRecapData(res?.data?.data || res?.data || null);
        return;
      } catch (err) {
        // Fallback otomatis jika server backend belum di-restart setelah penambahan rute /reports/monthly
        if (err?.response?.status !== 404) throw err;
      }

      const lastDay = new Date(tahun, bulan, 0).getDate();
      const startDateStr = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
      const endDateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [mutRes, defRes, prodRes, outRes] = await Promise.all([
        axiosClient.get('/reports/mutations', {
          params: { start_date: startDateStr, end_date: endDateStr, outlet_id: targetOutlet || undefined }
        }),
        axiosClient.get('/reports/defects', {
          params: { start_date: startDateStr, end_date: endDateStr }
        }).catch(() => ({ data: [] })),
        axiosClient.get('/products?limit=1000'),
        outlets.length > 0 ? Promise.resolve({ data: outlets }) : axiosClient.get('/outlets').catch(() => ({ data: [] }))
      ]);

      const mutRows = mutRes?.data?.data || mutRes?.data || [];
      const defRows = defRes?.data?.data || defRes?.data || [];
      const prodList = prodRes?.data?.data || prodRes?.data || [];
      const outList = outRes?.data?.data || outRes?.data || outlets || [];

      const mutByProduct = {};
      const branchStatsMap = {};
      outList.forEach(o => {
        if (!targetOutlet || String(o.id) === String(targetOutlet)) {
          branchStatsMap[o.nama] = {
            id: o.id,
            nama: o.nama,
            tipe: o.tipe,
            total_masuk: 0,
            total_keluar: 0,
            nilai_pemakaian: 0,
            total_defect: 0,
            opname_final_count: 0
          };
        }
      });

      const priceByName = {};
      prodList.forEach(p => {
        priceByName[p.nama] = parseFloat(p.harga || 0);
      });

      mutRows.forEach(r => {
        const pName = r.product_name;
        const masuk = parseInt(r.total_masuk || 0);
        const keluar = parseInt(r.total_keluar || 0);
        const saw = parseInt(r.saw_awal || 0);
        const sak = parseInt(r.sak_akhir || 0);
        const harga = priceByName[pName] || 0;

        if (!mutByProduct[pName]) {
          mutByProduct[pName] = { saw_awal_bulan: saw, total_masuk: 0, total_keluar: 0, sak_akhir_bulan: 0 };
        }
        mutByProduct[pName].total_masuk += masuk;
        mutByProduct[pName].total_keluar += keluar;
        mutByProduct[pName].sak_akhir_bulan += sak;

        if (branchStatsMap[r.outlet_name]) {
          branchStatsMap[r.outlet_name].total_masuk += masuk;
          branchStatsMap[r.outlet_name].total_keluar += keluar;
          branchStatsMap[r.outlet_name].nilai_pemakaian += keluar * harga;
        }
      });

      defRows.forEach(d => {
        if (branchStatsMap[d.outlet_name]) {
          branchStatsMap[d.outlet_name].total_defect += parseInt(d.total_defect || 0);
        }
      });

      const fallbackItems = prodList.map(p => {
        const m = mutByProduct[p.nama] || { saw_awal_bulan: 0, total_masuk: 0, total_keluar: 0, sak_akhir_bulan: 0 };
        const harga = parseFloat(p.harga || 0);
        return {
          id: p.id,
          kode: p.kode,
          nama: p.nama,
          kategori: p.kategori || 'Bahan Umum',
          satuan: p.satuan || 'Pcs',
          harga,
          saw_awal_bulan: m.saw_awal_bulan,
          total_masuk: m.total_masuk,
          total_keluar: m.total_keluar,
          rata_rata_harian: Number((m.total_keluar / lastDay).toFixed(2)),
          sak_akhir_bulan: m.sak_akhir_bulan,
          nilai_persediaan: m.sak_akhir_bulan * harga,
          nilai_pemakaian: m.total_keluar * harga
        };
      });

      const fallbackBranches = Object.values(branchStatsMap);
      setRecapData({
        summary: {
          bulan,
          tahun,
          jumlah_hari: lastDay,
          total_item: fallbackItems.length,
          item_aktif_bergerak: fallbackItems.filter(i => i.total_masuk > 0 || i.total_keluar > 0).length,
          total_unit_masuk: fallbackItems.reduce((a, i) => a + i.total_masuk, 0),
          total_unit_keluar: fallbackItems.reduce((a, i) => a + i.total_keluar, 0),
          total_nilai_pemakaian: fallbackItems.reduce((a, i) => a + i.nilai_pemakaian, 0),
          total_nilai_persediaan: fallbackItems.reduce((a, i) => a + i.nilai_persediaan, 0),
          total_defect_bulan: fallbackBranches.reduce((a, b) => a + b.total_defect, 0)
        },
        branches: fallbackBranches,
        items: fallbackItems
      });
    } catch (e) {
      toast.error('Gagal memuat data rekapitulasi bulanan');
    } finally {
      setRecapLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyRecap();
    setCurrentPage(1);
  }, [selectedOutlet, bulan, tahun]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, onlyActiveMovement]);

  const handleCustomExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih rentang tanggal terlebih dahulu');
      return;
    }
    try {
      setCustomLoading(true);
      const targetOutlet = isBranchLocked ? defaultLockedOutlet : selectedOutlet;
      const res = await axiosClient.get('/reports/export/excel', {
        params: { start_date: startDate, end_date: endDate, outlet_id: targetOutlet || undefined },
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
      toast.success('Laporan rentang tanggal berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh laporan rentang tanggal');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleMitraExport = async (overrideOutletId = null, overrideOutletName = null) => {
    const targetOutlet = overrideOutletId || (isBranchLocked ? defaultLockedOutlet : selectedOutlet) || outlets[0]?.id;
    if (!targetOutlet) return toast.error('Pilih cabang terlebih dahulu untuk mengunduh format 31 sheet');
    if (!bulan || !tahun) return toast.error('Pilih bulan dan tahun');

    try {
      if (overrideOutletId) setDownloadingBranchId(overrideOutletId);
      else setMitraLoading(true);

      const res = await axiosClient.get('/reports/monthly/export', {
        params: { outlet_id: targetOutlet, bulan, tahun },
        responseType: 'blob',
      });

      const outletName =
        overrideOutletName ||
        outlets.find(o => String(o.id) === String(targetOutlet))?.nama ||
        user?.outlet_name ||
        'Outlet';
      const filename = `Laporan_Stok_${outletName.replace(/\s+/g, '_')}_${String(bulan).padStart(2, '0')}-${tahun}.xlsx`;

      const blob = res instanceof Blob ? res : new Blob([res?.data || res]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`Spreadsheet 31 Sheet (${outletName}) berhasil diunduh`);
    } catch {
      toast.error('Gagal mengunduh laporan format mitra');
    } finally {
      setDownloadingBranchId(null);
      setMitraLoading(false);
    }
  };

  const summary = recapData?.summary || {
    bulan,
    tahun,
    jumlah_hari: 30,
    total_item: 0,
    item_aktif_bergerak: 0,
    total_unit_masuk: 0,
    total_unit_keluar: 0,
    total_nilai_pemakaian: 0,
    total_nilai_persediaan: 0,
    total_defect_bulan: 0,
  };
  const branches = recapData?.branches || [];
  const items = recapData?.items || [];

  const filteredItems = items.filter(item => {
    if (onlyActiveMovement && item.total_masuk === 0 && item.total_keluar === 0) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(q) ||
      item.kode?.toLowerCase().includes(q) ||
      item.kategori?.toLowerCase().includes(q)
    );
  });

  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedOutletName = isBranchLocked
    ? (user?.outlet_name || 'Cabang Aktif')
    : (selectedOutlet
        ? (outlets.find(o => String(o.id) === String(selectedOutlet))?.nama || 'Cabang Terpilih')
        : 'Seluruh Cabang (Konsolidasi)');

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 text-white">
      {/* ── HEADER & FILTER PERIODE BULANAN ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileBarChart className="text-[#F9610D]" size={28} />
            Rekapitulasi Bulanan & Ekspor Laporan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Pantau rekap mutasi bahan baku bulanan, valuasi sisa stok, dan unduh format pembukuan mitra 31 sheet.
          </p>
        </div>

        {/* Filter Bar: Cabang, Bulan, Tahun */}
        <div className="flex flex-wrap items-center gap-3">
          {!isBranchLocked && (
            <div className="flex items-center gap-2 bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2">
              <Store size={14} className="text-[#F9610D]" />
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#140F0D]">Seluruh Cabang (Konsolidasi)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id} className="bg-[#140F0D]">{o.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2">
            <Calendar size={14} className="text-[#FFCE00]" />
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {BULAN_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-[#140F0D]">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            min="2020"
            max="2100"
            className="w-24 bg-[#120E0C] border border-[#2D241E] rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-[#F9610D]"
          />

          <button
            onClick={fetchMonthlyRecap}
            className="p-2.5 bg-[#120E0C] border border-[#2D241E] hover:border-stone-500 rounded-xl text-stone-300 hover:text-white transition-all cursor-pointer"
            title="Segarkan Rekap Bulanan"
          >
            <RefreshCw size={15} className={recapLoading ? 'animate-spin text-[#F9610D]' : ''} />
          </button>
        </div>
      </div>

      {/* ── 4 KARTU RINGKASAN EKSEKUTIF BULANAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Suplai Masuk</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-3">
            +{summary.total_unit_masuk.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-stone-400">Unit</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Periode {BULAN_NAMES[bulan - 1]} {tahun} ({summary.item_aktif_bergerak} bahan bergerak)
          </p>
        </div>

        <div className="rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Pemakaian Dapur</span>
            <span className="p-2 rounded-xl bg-[#F9610D]/10 text-[#F9610D] border border-[#F9610D]/20">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-3">
            {summary.total_unit_keluar.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-stone-400">Unit</span>
          </p>
          <p className="text-[11px] text-[#F9610D] font-bold mt-1">
            Valuasi: Rp {summary.total_nilai_pemakaian.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Valuasi Sisa Stok Akhir</span>
            <span className="p-2 rounded-xl bg-[#FFCE00]/10 text-[#FFCE00] border border-[#FFCE00]/20">
              <Package size={16} />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#FFCE00] mt-3 tracking-tight">
            Rp {summary.total_nilai_persediaan.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Estimasi nilai aset bahan baku akhir bulan
          </p>
        </div>

        <div className="rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Defect / Barang Rusak</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black mt-3 ${summary.total_defect_bulan > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary.total_defect_bulan.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-stone-400">Unit</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            {summary.total_defect_bulan > 0 ? 'Barang rusak/afkir disetujui bulan ini' : 'Nihil kerusakan bulan ini'}
          </p>
        </div>
      </div>

      {/* ── TABEL RAPOR BULANAN PER CABANG (KHUSUS OWNER & ADMIN PUSAT) ── */}
      {!isBranchLocked && branches.length > 0 && (
        <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#241C18]">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <Store size={18} className="text-[#F9610D]" />
                Rekap Performa Bulanan Antar Cabang ({BULAN_NAMES[bulan - 1]} {tahun})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Perbandingan arus barang masuk, konsumsi dapur, defect, dan unduh cepat Spreadsheet 31 Sheet per cabang.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Unit / Cabang</th>
                  <th className="py-3 px-3 text-right">Total Masuk</th>
                  <th className="py-3 px-3 text-right">Total Keluar (Konsumsi)</th>
                  <th className="py-3 px-3 text-right">Nilai Pemakaian (Rp)</th>
                  <th className="py-3 px-3 text-center">Defect Disetujui</th>
                  <th className="py-3 px-3 text-center">Stok Opname</th>
                  <th className="py-3 px-3 text-right">Spreadsheet Mitra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241C18]">
                {branches.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      String(selectedOutlet) === String(b.id) ? 'bg-[#F9610D]/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOutlet(String(b.id))}
                        className="text-left font-bold text-white hover:text-[#F9610D] transition-colors cursor-pointer"
                      >
                        {b.nama}
                      </button>
                      <span className="block text-[10px] text-stone-400 uppercase">
                        {b.tipe === 'PUSAT' ? 'Central Kitchen / Gudang Pusat' : 'Cabang Mitra'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-400 font-mono">
                      +{b.total_masuk.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#F9610D] font-mono">
                      -{b.total_keluar.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-white font-mono">
                      Rp {b.nilai_pemakaian.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        b.total_defect > 0
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-stone-800 text-stone-400'
                      }`}>
                        {b.total_defect} Unit
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {b.opname_final_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                          <CheckCircle2 size={12} /> {b.opname_final_count}x Final
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-500">Belum Opname</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleMitraExport(b.id, b.nama)}
                        disabled={downloadingBranchId === b.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221B17] hover:bg-[#F9610D] text-stone-200 hover:text-white border border-[#2D241E] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Download size={13} />
                        <span>{downloadingBranchId === b.id ? 'Mengunduh...' : 'Unduh 31 Sheet'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TABEL REKAPITULASI BULANAN PER BAHAN BAKU (DI LAYAR WEB) ── */}
      <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#241C18]">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <Table2 size={18} className="text-[#FFCE00]" />
              Tabel Rekapitulasi Bulanan Per Bahan Baku — {selectedOutletName}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Rincian Stok Awal Bulan (SAW), Akumulasi Masuk, Total Pemakaian (Keluar), Rata-rata Harian, dan Valuasi Sisa Stok Akhir Bulan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-stone-300 bg-[#120E0C] border border-[#2D241E] px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={onlyActiveMovement}
                onChange={(e) => setOnlyActiveMovement(e.target.checked)}
                className="rounded border-stone-600 text-[#F9610D] focus:ring-[#F9610D]"
              />
              <span>Hanya yang ada mutasi</span>
            </label>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode bahan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#120E0C] border border-[#2D241E] rounded-xl text-xs text-white focus:outline-none focus:border-[#F9610D]"
              />
            </div>
          </div>
        </div>

        {recapLoading ? (
          <div className="py-16 text-center text-xs text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#F9610D] mb-2" />
            Menghitung rekapitulasi bulanan...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Tidak ada data bahan baku yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">Nama Bahan Baku</th>
                    <th className="py-3 px-3 text-right">Harga/Satuan</th>
                    <th className="py-3 px-3 text-right">SAW Awal Bulan</th>
                    <th className="py-3 px-3 text-right">Total Masuk</th>
                    <th className="py-3 px-3 text-right">Total Keluar</th>
                    <th className="py-3 px-3 text-right">Rata-rata/Hari</th>
                    <th className="py-3 px-3 text-right">SAK Akhir Bulan</th>
                    <th className="py-3 px-3 text-right">Nilai Persediaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241C18]">
                  {paginatedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-stone-400 font-mono">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{item.nama}</div>
                        <div className="text-[11px] text-stone-400">
                          {item.kode} • {item.kategori} ({item.satuan})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-stone-300 font-mono">
                        Rp {item.harga.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right text-stone-300 font-mono">
                        {item.saw_awal_bulan.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                        +{item.total_masuk.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#F9610D] font-mono">
                        -{item.total_keluar.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right text-stone-300 font-mono">
                        {item.rata_rata_harian.toLocaleString('id-ID')} /hr
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-white font-mono">
                        {item.sak_akhir_bulan.toLocaleString('id-ID')} {item.satuan}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#FFCE00] font-mono">
                        Rp {item.nilai_persediaan.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredItems.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* ── KARTU UNDUH DOKUMEN EXCEL (.XLSX) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KARTU 1: FORMAT BULANAN MITRA (31 SHEET + REKAP BULANAN + STOK OPNAME) */}
        <div className="bg-[#1A1412] border border-[#2D241E] hover:border-[#F9610D]/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F9610D]/20 text-[#F9610D] border border-[#F9610D]/35 text-[10px] font-extrabold uppercase tracking-wide">
                  Format Standar Mitra
                </span>
                <h3 className="text-lg font-black text-white tracking-tight mt-2">
                  Unduh Spreadsheet Bulanan Mitra (31 Sheet)
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Berisi sheet harian (<strong>TANGGAL 1 s/d 31</strong> untuk 3 shift), sheet <strong>REKAP BULANAN</strong>, dan sheet <strong>STOK OPNAME</strong> untuk cabang serta periode yang dipilih di atas.
                </p>
              </div>
              <div className="p-3 bg-[#F9610D]/10 rounded-2xl text-[#F9610D] border border-[#F9610D]/20 shrink-0">
                <FileSpreadsheet size={24} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#120E0C] border border-[#2D241E] text-xs text-stone-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-400">Target Cabang:</span>
                <strong className="text-white">
                  {selectedOutlet
                    ? (outlets.find(o => String(o.id) === String(selectedOutlet))?.nama || user?.outlet_name)
                    : (outlets[0]?.nama || 'Pilih cabang di filter atas')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Periode Rekap:</span>
                <strong className="text-[#FFCE00]">{BULAN_NAMES[bulan - 1]} {tahun}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleMitraExport()}
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
                <span>Unduh Format Mitra Bulanan (.xlsx)</span>
              </>
            )}
          </button>
        </div>

        {/* KARTU 2: EXPORT CUSTOM (RENTANG TANGGAL BEBAS) */}
        <div className="bg-[#1A1412] border border-[#2D241E] hover:border-[#FFCE00]/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFCE00]/15 text-[#FFCE00] border border-[#FFCE00]/30 text-[10px] font-extrabold uppercase tracking-wide">
                  Rentang Tanggal Kustom
                </span>
                <h3 className="text-lg font-black text-white tracking-tight mt-2">
                  Ekspor Mutasi Rentang Tanggal (.xlsx)
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Unduh rekap pergerakan mutasi stok berdasarkan rentang tanggal mulai dan akhir tertentu.
                </p>
              </div>
              <div className="p-3 bg-[#FFCE00]/10 rounded-2xl text-[#FFCE00] border border-[#FFCE00]/20 shrink-0">
                <Download size={24} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#FFCE00]" /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#FFCE00]"
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
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#FFCE00]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCustomExport}
            disabled={customLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#251D18] hover:bg-[#342720] border border-[#3E3027] hover:border-[#FFCE00]/60 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg mt-6 cursor-pointer disabled:opacity-50"
          >
            {customLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                <span>Mengekspor Data...</span>
              </div>
            ) : (
              <>
                <Download size={17} className="text-[#FFCE00]" />
                <span>Unduh Excel Rentang Tanggal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Laporan;
