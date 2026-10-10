import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Send, AlertCircle, RefreshCw, Radar, XCircle, Trash2, Printer, History, FileText, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import SuratJalanModal from '../components/SuratJalanModal';

const Transfer = () => {
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' | 'riwayat'
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  
  const [fromOutlet, setFromOutlet] = useState('');
  const [toOutlet, setToOutlet] = useState('');
  const [transferItems, setTransferItems] = useState([{ product_id: '', qty: '' }]);
  const [catatan, setCatatan] = useState('');
  const [password, setPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  // Radar State
  const [activeRadar, setActiveRadar] = useState(null); // { index, product_id }
  const [radarData, setRadarData] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);

  // Surat Jalan State
  const [isSuratJalanOpen, setIsSuratJalanOpen] = useState(false);
  const [selectedSuratJalan, setSelectedSuratJalan] = useState(null);

  useEffect(() => {
    fetchData();
    fetchTransfers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resOutlets, resProducts] = await Promise.all([
        axiosClient.get('/outlets'),
        axiosClient.get('/products')
      ]);
      
      const outletsData = resOutlets?.data?.data || resOutlets?.data || [];
      setOutlets(outletsData);
      setProducts(resProducts?.data?.data || resProducts?.data || []);
      
      // Auto set fromOutlet if user is branch staff
      if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
        setFromOutlet(user.outlet_id.toString());
      }
    } catch {
      toast.error('Gagal memuat data master');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const res = await axiosClient.get('/transfers');
      setTransfers(res?.data?.data || res?.data || []);
    } catch {
      console.error('Gagal mengambil riwayat transfer');
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleAddItem = () => {
    setTransferItems([...transferItems, { product_id: '', qty: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...transferItems];
    newItems.splice(index, 1);
    setTransferItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...transferItems];
    newItems[index][field] = value;
    setTransferItems(newItems);
  };

  const handleOpenRadar = async (index, product_id) => {
    if (!product_id) return;
    setActiveRadar({ index, product_id });
    setRadarLoading(true);
    try {
      const res = await axiosClient.get(`/stocks/radar/${product_id}`);
      setRadarData(res.data || []);
    } catch {
      toast.error('Gagal mengambil data radar stok');
    } finally {
      setRadarLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromOutlet || !toOutlet) {
      toast.error('Pilih Cabang Asal dan Tujuan');
      return;
    }
    if (fromOutlet === toOutlet) {
      toast.error('Cabang Asal dan Tujuan tidak boleh sama');
      return;
    }
    if (!password) {
      toast.error('Password otorisasi wajib diisi');
      return;
    }

    // Filter valid items
    const validItems = transferItems.filter(item => item.product_id && item.qty > 0);
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal satu produk dengan jumlah > 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        from_outlet_id: parseInt(fromOutlet),
        to_outlet_id: parseInt(toOutlet),
        catatan,
        password,
        items: validItems.map(item => ({
          product_id: parseInt(item.product_id),
          qty: parseInt(item.qty)
        }))
      };

      const res = await axiosClient.post('/transfers', payload);
      toast.success('Transfer berhasil! Surat Jalan siap dicetak.');
      
      const fromObj = outlets.find(o => o.id === parseInt(fromOutlet));
      const toObj = outlets.find(o => o.id === parseInt(toOutlet));

      // Prepare data for immediate printing
      const suratData = {
        kode_transfer: res?.data?.data?.kode_transfer || `SJ-TRF-${Date.now()}`,
        created_at: new Date().toISOString(),
        from_outlet_name: fromObj?.nama || 'Cabang Asal',
        from_outlet_address: fromObj?.alamat || '',
        to_outlet_name: toObj?.nama || 'Cabang Tujuan',
        to_outlet_address: toObj?.alamat || '',
        creator_name: user?.nama || 'Admin/Staf',
        catatan,
        items: validItems.map(item => {
          const p = products.find(prod => prod.id === parseInt(item.product_id));
          return {
            product_kode: p?.kode || 'PRD',
            product_name: p?.nama || 'Produk',
            product_satuan: p?.satuan || 'pcs',
            qty: parseInt(item.qty)
          };
        })
      };

      // Open Surat Jalan preview immediately
      setSelectedSuratJalan(suratData);
      setIsSuratJalanOpen(true);

      // Reset Form
      setTransferItems([{ product_id: '', qty: '' }]);
      setCatatan('');
      setPassword('');
      if (user?.role !== 'STAF_CABANG') {
        setFromOutlet('');
      }
      setToOutlet('');
      fetchTransfers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses transfer cabang');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintTransfer = (trf) => {
    setSelectedSuratJalan(trf);
    setIsSuratJalanOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F9610D]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-white animate-fade-in">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Send className="w-7 h-7 text-[#F9610D]" />
            Transfer Antar Cabang
          </h1>
          <p className="text-stone-400 mt-1 text-sm">
            Distribusi stok fisik realtime & Cetak Surat Jalan resmi serah terima barang
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[#16110F] p-1.5 rounded-2xl border border-[#2D241E]">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-[#F9610D] text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Transfer</span>
          </button>
          <button
            onClick={() => { setActiveTab('riwayat'); fetchTransfers(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-[#F9610D] text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat & Surat Jalan</span>
            {transfers.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/40 text-stone-200">
                {transfers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'transfer' ? (
        <div className="bg-[#1A1412] rounded-3xl shadow-xl border border-[#2D241E] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Outlet */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-2">Cabang Asal</label>
                <select
                  value={fromOutlet}
                  onChange={(e) => setFromOutlet(e.target.value)}
                  disabled={user?.role === 'STAF_CABANG'}
                  className="w-full px-4 py-3 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D] disabled:opacity-50"
                >
                  <option value="">Pilih Cabang Asal</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>

              {/* To Outlet */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-2">Cabang Tujuan</label>
                <select
                  value={toOutlet}
                  onChange={(e) => setToOutlet(e.target.value)}
                  className="w-full px-4 py-3 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                >
                  <option value="">Pilih Cabang Tujuan</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-[#241C18] pt-6">
              <h3 className="text-sm font-bold text-white mb-4">Item Transfer</h3>
              
              <div className="space-y-4">
                {transferItems.map((item, index) => (
                  <div key={index} className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                      <div className="flex-1 w-full">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full px-4 py-3 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                        >
                          <option value="">Pilih Produk...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.nama} ({p.satuan})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full md:w-48">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="w-full px-4 py-3 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D]"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenRadar(index, item.product_id)}
                          disabled={!item.product_id}
                          className="text-[#F9610D] hover:bg-[#F9610D]/10 font-medium p-3 rounded-xl border border-[#F9610D]/30 transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                          title="Cek Ketersediaan Stok Lintas Cabang"
                        >
                          <Radar className="w-5 h-5" />
                        </button>
                        {transferItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-[#EC1F27] hover:bg-[#EC1F27]/10 font-medium p-3 bg-red-950/20 border border-red-500/20 rounded-xl cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {activeRadar?.index === index && (
                      <div className="w-full mt-2 p-4 sm:p-5 bg-[#130E0C] border border-[#2D241E] rounded-2xl animate-fade-in relative overflow-hidden shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm text-white flex items-center gap-2">
                            <Radar className="w-4 h-4 text-[#F9610D]" /> Radar Stok Lintas Cabang
                          </h4>
                          <button
                            type="button"
                            onClick={() => setActiveRadar(null)}
                            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {radarLoading ? (
                          <div className="flex justify-center py-4">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#F9610D]" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {radarData.length > 0 ? radarData.map(r => {
                              const isSafe = r.qty_current > r.min_qty;
                              return (
                                <div
                                  key={r.outlet_id}
                                  className={`p-3.5 rounded-xl border ${
                                    isSafe
                                      ? 'bg-emerald-950/20 border-emerald-500/30'
                                      : 'bg-red-950/20 border-red-500/30'
                                  } flex justify-between items-center`}
                                >
                                  <div>
                                    <div className="font-bold text-sm text-white">{r.outlet_name}</div>
                                    <div className="text-xs text-stone-400">Batas Aman: {r.min_qty}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-black text-lg ${isSafe ? 'text-emerald-400' : 'text-[#EC1F27]'}`}>
                                      {r.qty_current}
                                    </div>
                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${isSafe ? 'text-emerald-400' : 'text-[#EC1F27]'}`}>
                                      {isSafe ? 'Aman' : 'Kritis'}
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="col-span-full text-center text-xs text-stone-400 py-3">
                                Tidak ada data stok untuk produk ini.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 text-xs font-bold text-[#F9610D] hover:underline cursor-pointer flex items-center gap-1.5"
              >
                + Tambah Item Produk
              </button>
            </div>

            {/* Catatan Pengiriman */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-2">
                Catatan Pengiriman / Instruksi Driver (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Titip ke Driver Ojol, harap disimpan di chiller segera..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-4 py-3 bg-[#130E0C] border border-[#2D241E] rounded-xl text-white text-sm focus:outline-none focus:border-[#F9610D] placeholder:text-stone-600"
              />
            </div>

            {/* Otorisasi Transfer */}
            <div className="border-t border-[#241C18] pt-6 bg-red-950/20 -mx-6 sm:-mx-8 px-6 sm:px-8 pb-6 rounded-b-3xl border-b border-red-900/30">
              <div className="flex items-start gap-3 mb-4 mt-2">
                <AlertCircle className="w-5 h-5 text-[#EC1F27] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-red-200">
                  <p className="font-bold mb-1 text-white">Otorisasi Transfer & Penerbitan Surat Jalan</p>
                  <p className="text-stone-300">
                    Sistem akan memotong stok secara realtime dan otomatis menerbitkan Surat Jalan resmi. Masukkan PIN/Password akun Anda:
                  </p>
                </div>
              </div>
              
              <div className="max-w-sm">
                <input
                  type="password"
                  placeholder="Masukkan PIN / Password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#130E0C] border border-red-500/40 text-white rounded-xl focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 text-sm placeholder:text-stone-600"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white font-bold rounded-xl shadow-lg shadow-[#F9610D]/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Proses Transfer & Buat Surat Jalan</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Riwayat Transfer & Cetak Surat Jalan */
        <div className="bg-[#1A1412] rounded-3xl shadow-xl border border-[#2D241E] overflow-hidden">
          <div className="p-6 border-b border-[#2D241E] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#F9610D]" />
                Riwayat Pengiriman & Arsip Surat Jalan
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Pilih transaksi untuk mencetak ulang Surat Jalan resmi bertanda tangan
              </p>
            </div>
            <button
              onClick={fetchTransfers}
              className="p-2 text-stone-400 hover:text-white bg-[#130E0C] border border-[#2D241E] rounded-xl transition-all cursor-pointer"
              title="Refresh Riwayat"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTransfers ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            {loadingTransfers ? (
              <div className="py-16 text-center text-stone-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F9610D] mb-2" />
                Memuat riwayat transfer...
              </div>
            ) : transfers.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#140F0D] text-stone-400 font-semibold text-xs uppercase tracking-wider border-b border-[#2D241E]">
                  <tr>
                    <th className="px-6 py-4">No. Surat Jalan</th>
                    <th className="px-6 py-4">Tanggal & Jam</th>
                    <th className="px-6 py-4">Dari (Asal)</th>
                    <th className="px-6 py-4">Ke (Tujuan)</th>
                    <th className="px-6 py-4 text-center">Jumlah Item</th>
                    <th className="px-6 py-4">Petugas</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241B17]">
                  {transfers.map((trf, idx) => (
                    <tr key={idx} className="hover:bg-[#1E1714] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#FFCE00]">
                        {trf.kode_transfer}
                      </td>
                      <td className="px-6 py-4 text-stone-300 text-xs">
                        {new Date(trf.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {trf.from_outlet_name}
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400">
                        {trf.to_outlet_name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#140F0D] border border-[#2D241E] text-stone-200">
                          {trf.items?.length || 1} Bahan
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-400">
                        {trf.creator_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handlePrintTransfer(trf)}
                          className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-[#F9610D]/10 hover:bg-[#F9610D] text-[#F9610D] hover:text-white border border-[#F9610D]/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Surat Jalan</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-stone-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Belum ada transaksi transfer yang tercatat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Surat Jalan Printable Modal */}
      <SuratJalanModal
        isOpen={isSuratJalanOpen}
        onClose={() => setIsSuratJalanOpen(false)}
        data={selectedSuratJalan}
      />
    </div>
  );
};

export default Transfer;
