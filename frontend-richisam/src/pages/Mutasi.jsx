import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { ArrowLeftRight, Save, RefreshCw, AlertCircle, FileText, Calendar, RotateCcw } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Mutasi = () => {
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(() => {
    return user?.role === 'STAF_CABANG' ? user.outlet_id?.toString() || '' : '';
  });
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('PAGI');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formItems, setFormItems] = useState([]); // Array of objects matching form structure
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Ref for table inputs to handle keyboard navigation
  const inputRefs = useRef({});

  useEffect(() => {
    if (user?.role !== 'STAF_CABANG') {
      const fetchOutlets = async () => {
        try {
          const res = await axiosClient.get('/outlets');
          setOutlets(res?.data?.data || res?.data || []);
          if (res?.data?.length > 0) {
            setSelectedOutlet(res.data[0].id.toString());
          }
        } catch {
          toast.error('Gagal memuat cabang');
        }
      };
      fetchOutlets();
    }
  }, [user]);

  const fetchForm = async () => {
    if (!selectedOutlet) return toast.error('Pilih outlet terlebih dahulu');
    try {
      setLoading(true);
      const res = await axiosClient.get(`/mutations/form`, {
        params: { outlet_id: selectedOutlet, tanggal, shift }
      });
      const data = res?.data?.data || res?.data || [];
      
      const formatted = data.map(item => {
        const hasExistingRecord = item.sak !== undefined && item.sak !== null;
        const sawVal = item.saw || 0;
        const masukVal = item.masuk || 0;
        return {
          product_id: item.product_id,
          urutan: item.urutan,
          kode: item.kode,
          nama: item.nama,
          satuan: item.satuan,
          harga: item.harga || 0,
          par_stock: item.par_stock || 0,
          saw: sawVal,
          masuk: masukVal,
          // Default SAK ke SAW + Masuk (Keluar = 0) agar barang yang tidak dipakai tidak terkuras ke 0
          sak: hasExistingRecord ? item.sak : (sawVal + masukVal),
          sakEdited: hasExistingRecord,
          alreadySaved: hasExistingRecord
        };
      });
      setFormItems(formatted);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat form mutasi');
      setFormItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (productId, field, value) => {
    const rawNum = value === '' ? 0 : parseInt(value, 10);
    const num = !isNaN(rawNum) && rawNum >= 0 ? rawNum : 0;
    setFormItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const totalAvailable = item.saw + (field === 'masuk' ? num : item.masuk);

        if (field === 'masuk') {
          let nextSak;
          if (item.lastEditedMode === 'keluar') {
            const currentKeluar = Math.max(0, item.saw + item.masuk - item.sak);
            nextSak = Math.max(0, totalAvailable - currentKeluar);
          } else if (item.sakEdited) {
            nextSak = item.sak;
          } else {
            nextSak = totalAvailable;
          }
          return { ...item, masuk: num, sak: nextSak };
        }

        if (field === 'sak') {
          return {
            ...item,
            sak: num,
            sakEdited: true,
            lastEditedMode: 'sak'
          };
        }

        if (field === 'keluar') {
          // Input 2-Arah: saat Keluar diubah, SAK otomatis terhitung mundur: SAK = (SAW + Masuk) - Keluar
          const nextSak = totalAvailable - num;
          return {
            ...item,
            sak: nextSak,
            sakEdited: true,
            lastEditedMode: 'keluar'
          };
        }

        return { ...item, [field]: num };
      }
      return item;
    }));
  };

  const handleResetSakToSaw = () => {
    setFormItems(prev => prev.map(item => ({
      ...item,
      sak: item.saw + item.masuk,
      sakEdited: false,
      lastEditedMode: null
    })));
    toast.success('Seluruh kolom Fisik (SAK) dikembalikan ke posisi Stok Awal + Masuk (Keluar = 0)');
  };

  const handleKeyDown = (e, productId, field, rowIndex) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Move to next row same field
      const nextRef = inputRefs.current[`${rowIndex + 1}-${field}`];
      if (nextRef) nextRef.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move to prev row same field
      const prevRef = inputRefs.current[`${rowIndex - 1}-${field}`];
      if (prevRef) prevRef.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (field === 'masuk') {
        const nextRef = inputRefs.current[`${rowIndex}-sak`];
        if (nextRef) nextRef.focus();
      } else if (field === 'sak') {
        const nextRef = inputRefs.current[`${rowIndex}-keluar`];
        if (nextRef) nextRef.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (field === 'keluar') {
        const prevRef = inputRefs.current[`${rowIndex}-sak`];
        if (prevRef) prevRef.focus();
      } else if (field === 'sak') {
        const prevRef = inputRefs.current[`${rowIndex}-masuk`];
        if (prevRef) prevRef.focus();
      }
    }
  };

  const calculateK = (item) => {
    return item.saw + item.masuk - item.sak;
  };

  const calculateTotalHarga = (item) => {
    return item.sak * item.harga;
  };

  const handleSave = async () => {
    // Check for negative K or negative SAK
    const hasNegativeK = formItems.some(item => calculateK(item) < 0 || item.sak < 0);
    if (hasNegativeK) {
      return toast.error('Terdapat item dengan nilai Keluar melebihi total barang tersedia. Periksa kembali hitungan fisik Anda.');
    }

    // Peringatan cerdas jika ada barang masuk banyak tapi Keluar = 0
    const totalMasukAll = formItems.reduce((acc, i) => acc + (i.masuk || 0), 0);
    const totalKeluarAll = formItems.reduce((acc, i) => acc + calculateK(i), 0);
    if (totalMasukAll > 0 && totalKeluarAll === 0) {
      const confirmZeroOut = window.confirm(
        `Perhatian:\nAnda telah menginput total ${totalMasukAll.toLocaleString('id-ID')} unit barang masuk, namun kolom Keluar/Pemakaian masih 0.\n\nApakah shift ini benar-benar TIDAK ADA bahan yang dimasak/digunakan?\n\n• Klik OK untuk tetap menyimpan dengan Keluar = 0.\n• Klik Batal untuk kembali mengisi kolom Keluar atau Fisik.`
      );
      if (!confirmZeroOut) return;
    }

    // Hanya kirim item yang benar-benar ada pergerakan (Masuk > 0 atau Keluar > 0) atau sudah pernah disimpan di shift ini
    const activeItems = formItems.filter(
      item => item.masuk > 0 || calculateK(item) > 0 || item.alreadySaved || item.sakEdited
    );

    if (activeItems.length === 0) {
      return toast.error('Belum ada perubahan Barang Masuk (M) atau Fisik (SAK) yang diinput pada shift ini.');
    }

    // Pengaman konfirmasi jika banyak barang sekaligus diubah menjadi SAK = 0
    const zeroedItems = activeItems.filter(item => item.saw > 0 && item.sak === 0);
    if (zeroedItems.length >= 10) {
      const ok = window.confirm(
        `Perhatian: Terdapat ${zeroedItems.length} jenis bahan baku yang dicatat habis total (SAK = 0) sekaligus pada shift ini.\n\nApakah Anda yakin seluruh barang tersebut benar-benar habis terpakai?`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        outlet_id: parseInt(selectedOutlet),
        tanggal,
        shift,
        items: activeItems.map(item => ({
          product_id: item.product_id,
          masuk: item.masuk,
          sak: item.sak
        }))
      };

      await axiosClient.post('/mutations', payload);
      const usedCount = activeItems.filter(item => calculateK(item) > 0 || item.masuk > 0).length;
      toast.success(`Mutasi berhasil disimpan (${usedCount} bahan bergerak tercatat)`);
      fetchForm();
    } catch (e) {
      const firstDetailError = e.response?.data?.errors?.[0]?.message;
      toast.error(firstDetailError || e.response?.data?.message || 'Gagal menyimpan mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  const totalPersediaan = formItems.reduce((acc, item) => acc + calculateTotalHarga(item), 0);
  const totalKeluar = formItems.reduce((acc, item) => acc + calculateK(item), 0);
  const totalNilaiPemakaianShift = formItems.reduce((acc, item) => acc + (Math.max(0, calculateK(item)) * (item.harga || 0)), 0);
  const jumlahBarangBergerak = formItems.filter(item => item.masuk > 0 || calculateK(item) > 0).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5 tracking-tight">
            <ArrowLeftRight className="h-7 w-7 text-[#F9610D]" />
            Input Mutasi Harian
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Laporan pemakaian dan hitung fisik stok persediaan bahan baku.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave} 
            disabled={formItems.length === 0 || loading || submitting} 
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white rounded-xl font-bold shadow-lg shadow-[#F9610D]/20 transition-all disabled:opacity-50 cursor-pointer text-sm"
          >
            {submitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            Simpan Mutasi
          </button>
        </div>
      </div>

      <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl shadow-xl overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="p-5 border-b border-[#241C18] bg-[#140F0D]/60 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {user?.role !== 'STAF_CABANG' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">Cabang / Outlet</label>
              <select 
                value={selectedOutlet}
                onChange={e => setSelectedOutlet(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#140F0D] border border-[#2D241E] rounded-xl text-sm text-white focus:outline-none focus:border-[#F9610D]"
              >
                <option value="">-- Pilih Outlet --</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input 
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#140F0D] border border-[#2D241E] rounded-xl text-sm text-white focus:outline-none focus:border-[#F9610D]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">Shift</label>
            <select 
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#140F0D] border border-[#2D241E] rounded-xl text-sm text-white focus:outline-none focus:border-[#F9610D]"
            >
              <option value="MIDNIGHT">MIDNIGHT</option>
              <option value="PAGI">PAGI</option>
              <option value="SORE">SORE</option>
            </select>
          </div>
          <div className="flex items-end h-full">
            <button 
              onClick={fetchForm}
              disabled={!selectedOutlet}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#F9610D] hover:bg-[#d9530a] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-[#F9610D]/20 flex items-center justify-center gap-2"
            >
              Tampilkan Form
            </button>
          </div>
        </div>

        {/* Search Bar & Real-World Summary Toolbar */}
        {formItems.length > 0 && !loading && (
          <div className="px-5 py-3.5 border-b border-[#241C18] bg-[#140F0D]/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <input 
                type="text" 
                placeholder="Cari produk (Filter baris)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-72 px-4 py-2 bg-[#140F0D] border border-[#2D241E] rounded-xl text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-[#F9610D]"
              />
              <button
                type="button"
                onClick={handleResetSakToSaw}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#221B17] hover:bg-[#2D241E] border border-[#2D241E] text-xs font-bold text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Kembalikan seluruh SAK mengikuti SAW + Masuk (Keluar = 0)"
              >
                <RotateCcw size={13} className="text-[#F9610D]" />
                <span>Reset SAK = Stok Awal</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-950/30 border border-[#F9610D]/30 text-xs text-[#FFCE00] font-medium">
                ✨ <strong>Input 2-Arah:</strong> Ketik di <strong>Keluar</strong> atau di <strong>Fisik</strong> (otomatis saling menghitung).
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#1A1412] border border-[#2D241E] text-stone-300 font-semibold">
                Bahan Bergerak: <strong className="text-[#FFCE00]">{jumlahBarangBergerak}</strong> / {formItems.length} Item
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#1A1412] border border-[#2D241E] text-stone-300 font-semibold">
                Total Unit Keluar: <strong className="text-[#F9610D]">{totalKeluar}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#1A1412] border border-[#2D241E] text-stone-300 font-semibold">
                Nilai Pemakaian Shift: <strong className="text-white">{formatRupiah(totalNilaiPemakaianShift)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-[#F9610D] mb-3" size={32} />
              <p className="text-stone-400 text-sm font-medium">Menyiapkan form mutasi...</p>
            </div>
          ) : formItems.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#16110F] text-stone-300 font-bold border-b border-[#2D241E] sticky top-0 z-10 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-14 text-center">No</th>
                  <th className="px-4 py-3.5 min-w-[200px]">Nama Produk</th>
                  <th className="px-4 py-3.5 text-center">Satuan</th>
                  <th className="px-4 py-3.5 text-right text-stone-300" title="Stok Awal (diambil dari SAK shift sebelumnya)">SAW</th>
                  <th className="px-4 py-3.5 w-32 text-emerald-400 font-bold" title="Barang Masuk / Pengiriman Datang">
                    Masuk (M)
                    <span className="block text-[9px] font-normal text-emerald-500 lowercase">[+ datang]</span>
                  </th>
                  <th className="px-4 py-3.5 w-32 text-[#FFCE00] font-bold" title="Sisa Fisik Nyata di Dapur saat Tutup Shift">
                    Fisik (SAK)
                    <span className="block text-[9px] font-normal text-amber-400 lowercase">[= sisa fisik]</span>
                  </th>
                  <th className="px-4 py-3.5 w-32 text-[#F9610D] font-bold" title="Bahan Baku Keluar / Dimasak">
                    Keluar (K)
                    <span className="block text-[9px] font-normal text-orange-400 lowercase">[- pemakaian]</span>
                  </th>
                  <th className="px-4 py-3.5 text-right">Nilai SAK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241C18]">
                {formItems
                  .filter(item => {
                    if (!searchQuery) return true;
                    return item.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || item.kode?.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map((item, idx) => {
                  const k = calculateK(item);
                  const isNegativeK = k < 0 || item.sak < 0;
                  const isBelowPar = item.sak < item.par_stock;

                  return (
                    <tr 
                      key={item.product_id} 
                      className={`transition-colors hover:bg-white/[0.03] ${isBelowPar ? 'bg-[#F9610D]/5' : ''}`}
                    >
                      {/* Nomor Urut Selalu Terlihat dengan Jelas */}
                      <td className="px-4 py-3 text-center font-bold text-stone-300">
                        {item.urutan || (idx + 1)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{item.nama}</p>
                        <p className="text-xs text-stone-400 mt-0.5">Par: {item.par_stock} • {formatRupiah(item.harga)}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-stone-300">{item.satuan}</td>
                      <td className="px-4 py-3 text-right font-black text-stone-200 bg-[#140F0D]/60">{item.saw}</td>
                      
                      {/* Input Masuk (M) */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.masuk === 0 ? '' : item.masuk}
                          placeholder="0"
                          onChange={e => handleInputChange(item.product_id, 'masuk', e.target.value)}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleKeyDown(e, item.product_id, 'masuk', idx)}
                          ref={el => inputRefs.current[`${idx}-masuk`] = el}
                          className="w-full px-2.5 py-1.5 text-right border border-[#2D241E] rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-[#140F0D] text-emerald-400 font-bold placeholder:text-stone-600 text-sm"
                        />
                      </td>

                      {/* Input Fisik (SAK) - 2-Way Reactive */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.sak === 0 && !item.sakEdited ? '' : item.sak}
                          placeholder="0"
                          onChange={e => handleInputChange(item.product_id, 'sak', e.target.value)}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleKeyDown(e, item.product_id, 'sak', idx)}
                          ref={el => inputRefs.current[`${idx}-sak`] = el}
                          className={`w-full px-2.5 py-1.5 text-right border rounded-lg focus:ring-1 focus:outline-none font-black text-sm ${
                            item.sak < 0
                              ? 'border-red-500 text-red-400 bg-red-950/40 focus:ring-red-500'
                              : isBelowPar 
                              ? 'border-[#F9610D] text-[#FFCE00] bg-orange-950/30 focus:ring-[#F9610D]' 
                              : 'border-[#2D241E] text-amber-300 bg-[#140F0D] focus:border-amber-400 focus:ring-amber-400'
                          }`}
                        />
                      </td>

                      {/* Input Keluar (K) - 2-Way Reactive */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={k === 0 && !item.sakEdited ? '' : (k < 0 ? 0 : k)}
                            placeholder="0"
                            onChange={e => handleInputChange(item.product_id, 'keluar', e.target.value)}
                            onFocus={e => e.target.select()}
                            onKeyDown={e => handleKeyDown(e, item.product_id, 'keluar', idx)}
                            ref={el => inputRefs.current[`${idx}-keluar`] = el}
                            className={`w-full px-2.5 py-1.5 text-right border rounded-lg focus:ring-1 focus:outline-none font-black text-sm ${
                              isNegativeK
                                ? 'border-red-500 text-red-400 bg-red-950/40 focus:ring-red-500'
                                : k > 0
                                ? 'border-[#F9610D]/70 text-[#F9610D] bg-orange-950/20 focus:border-[#F9610D] focus:ring-[#F9610D]'
                                : 'border-[#2D241E] text-stone-400 bg-[#140F0D] focus:border-[#F9610D] focus:ring-[#F9610D]'
                            }`}
                          />
                          {isNegativeK && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400" title="Keluar melebihi total barang tersedia">
                              <AlertCircle size={14} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nilai SAK */}
                      <td className="px-4 py-3 text-right text-stone-200 font-semibold bg-[#140F0D]/60">
                        {formatRupiah(calculateTotalHarga(item))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#16110F] border-t-2 border-[#2D241E] sticky bottom-0 z-10 text-white font-bold">
                <tr>
                  <td colSpan={6} className="px-4 py-3.5 text-right font-bold text-stone-300">Total Pengeluaran (K)</td>
                  <td className="px-4 py-3.5 text-right font-black text-[#EC1F27] text-base">{totalKeluar}</td>
                  <td className="px-4 py-3.5 text-right font-black text-[#FFCE00] text-base">{formatRupiah(totalPersediaan)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="py-24 text-center">
              <FileText size={48} className="mx-auto text-stone-600 mb-3" />
              <p className="text-stone-400 text-sm font-semibold">Pilih cabang, tanggal, dan shift lalu tekan Tampilkan Form</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mutasi;
