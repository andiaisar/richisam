import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { ArrowLeftRight, Save, RefreshCw, AlertCircle, FileText, Calendar } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Mutasi = () => {
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
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
        } catch (e) {
          toast.error('Gagal memuat cabang');
        }
      };
      fetchOutlets();
    } else {
      setSelectedOutlet(user.outlet_id?.toString() || '');
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
      
      const formatted = data.map(item => ({
        product_id: item.product_id,
        urutan: item.urutan,
        kode: item.kode,
        nama: item.nama,
        satuan: item.satuan,
        harga: item.harga || 0,
        par_stock: item.par_stock || 0,
        saw: item.saw || 0,
        masuk: item.masuk || 0, // pre-filled if already exists
        sak: item.sak !== undefined && item.sak !== null ? item.sak : 0, // default 0 or existing
      }));
      setFormItems(formatted);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat form mutasi');
      setFormItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (productId, field, value) => {
    const num = parseInt(value) || 0;
    setFormItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        return { ...item, [field]: num >= 0 ? num : 0 };
      }
      return item;
    }));
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
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (field === 'sak') {
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
    // Check for negative K
    const hasNegativeK = formItems.some(item => calculateK(item) < 0);
    if (hasNegativeK) {
      return toast.error('Terdapat item dengan nilai Keluar (K) negatif. Periksa kembali hitungan fisik Anda.');
    }

    setSubmitting(true);
    try {
      const payload = {
        outlet_id: parseInt(selectedOutlet),
        tanggal,
        shift,
        items: formItems.map(item => ({
          product_id: item.product_id,
          masuk: item.masuk,
          sak: item.sak
        }))
      };

      await axiosClient.post('/mutations', payload);
      toast.success('Data mutasi berhasil disimpan');
      // Optionally fetch again to reflect
      fetchForm();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
  };

  const totalPersediaan = formItems.reduce((acc, item) => acc + calculateTotalHarga(item), 0);
  const totalKeluar = formItems.reduce((acc, item) => acc + calculateK(item), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-richisam-orange" />
            Input Mutasi Harian
          </h1>
          <p className="mt-1 text-sm text-muted">Laporan pemakaian dan hitung fisik stok persediaan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave} 
            disabled={formItems.length === 0 || loading || submitting} 
            className="flex items-center gap-2 px-6 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            Simpan Mutasi
          </button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="p-4 border-b border-line bg-cream/30 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {user?.role !== 'STAF_CABANG' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Cabang/Outlet</label>
              <select 
                value={selectedOutlet}
                onChange={e => setSelectedOutlet(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
              >
                <option value="">-- Pilih Outlet --</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Shift</label>
            <select 
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
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
              className="w-full sm:w-auto px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              Tampilkan Form
            </button>
          </div>
        </div>

        {/* Search Bar (Client side filter) */}
        {formItems.length > 0 && !loading && (
          <div className="px-4 py-2 border-b border-line bg-white">
            <input 
              type="text" 
              placeholder="Cari produk (Filter baris)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20"
            />
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-richisam-orange mb-3" size={32} />
              <p className="text-muted text-sm">Menyiapkan form mutasi...</p>
            </div>
          ) : formItems.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-cream/50 text-muted font-semibold border-b border-line sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 min-w-[200px]">Nama Produk</th>
                  <th className="px-4 py-3 text-center">Satuan</th>
                  <th className="px-4 py-3 text-right text-gray-500" title="Stok Awal (diambil dari SAK shift sebelumnya)">SAW</th>
                  <th className="px-4 py-3 w-32">Masuk (M)</th>
                  <th className="px-4 py-3 w-32 text-richisam-orange font-bold">Fisik (SAK)</th>
                  <th className="px-4 py-3 text-right text-red-600" title="Keluar/Pemakaian">Keluar (K)</th>
                  <th className="px-4 py-3 text-right">Nilai SAK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {formItems
                  .filter(item => {
                    if (!searchQuery) return true;
                    return item.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || item.kode?.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map((item, idx) => {
                  const k = calculateK(item);
                  const isNegativeK = k < 0;
                  const isBelowPar = item.sak < item.par_stock;

                  return (
                    <tr 
                      key={item.product_id} 
                      className={`hover:bg-cream/30 transition-colors ${isBelowPar ? 'bg-orange-50/50' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-center text-muted">{item.urutan}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-ink">{item.nama}</p>
                        <p className="text-xs text-muted">Par: {item.par_stock} • {formatRupiah(item.harga)}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted">{item.satuan}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-600 bg-gray-50/50">{item.saw}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={item.masuk === 0 ? '' : item.masuk} // allow empty visually
                          placeholder="0"
                          onChange={e => handleInputChange(item.product_id, 'masuk', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, item.product_id, 'masuk', idx)}
                          ref={el => inputRefs.current[`${idx}-masuk`] = el}
                          className="w-full px-2 py-1.5 text-right border border-line rounded focus:ring-1 focus:ring-richisam-orange/50 focus:border-richisam-orange outline-none bg-white text-green-700 font-medium"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={item.sak === 0 && item.saw === 0 && item.masuk === 0 ? '' : item.sak}
                          placeholder="0"
                          onChange={e => handleInputChange(item.product_id, 'sak', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, item.product_id, 'sak', idx)}
                          ref={el => inputRefs.current[`${idx}-sak`] = el}
                          className={`w-full px-2 py-1.5 text-right border rounded focus:ring-1 focus:outline-none font-bold ${
                            isBelowPar 
                              ? 'border-orange-300 text-orange-700 bg-orange-50 focus:ring-orange-400 focus:border-orange-400' 
                              : 'border-line text-ink bg-white focus:ring-richisam-orange/50 focus:border-richisam-orange'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold bg-gray-50/50">
                        <span className={isNegativeK ? 'text-red-600 flex items-center justify-end gap-1' : 'text-ink'}>
                          {isNegativeK && <AlertCircle size={14} />}
                          {k}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted font-medium bg-gray-50/50">
                        {formatRupiah(calculateTotalHarga(item))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-cream border-t-2 border-line sticky bottom-0 z-10">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-bold text-ink">Total Pengeluaran (K)</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{totalKeluar}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatRupiah(totalPersediaan)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="py-24 text-center">
              <FileText size={48} className="mx-auto text-line mb-3" />
              <p className="text-muted text-sm font-medium">Pilih cabang, tanggal, dan shift lalu tekan Tampilkan Form</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mutasi;
