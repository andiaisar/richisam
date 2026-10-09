import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Send, AlertCircle, RefreshCw, Radar, XCircle, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Transfer = () => {
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [fromOutlet, setFromOutlet] = useState('');
  const [toOutlet, setToOutlet] = useState('');
  const [transferItems, setTransferItems] = useState([{ product_id: '', qty: '' }]);
  const [password, setPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Radar State
  const [activeRadar, setActiveRadar] = useState(null); // { index, product_id }
  const [radarData, setRadarData] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);

  useEffect(() => {
    fetchData();
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
    } catch (e) {
      toast.error('Gagal memuat data master');
    } finally {
      setLoading(false);
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
    } catch (e) {
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
      toast.error('Minimal harus ada 1 produk yang ditransfer dengan kuantitas > 0');
      return;
    }

    try {
      setSubmitting(true);
      await axiosClient.post('/transfers', {
        from_outlet_id: parseInt(fromOutlet),
        to_outlet_id: parseInt(toOutlet),
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id),
          qty: parseInt(i.qty)
        })),
        password
      });
      
      toast.success('Transfer Antar Cabang Berhasil dicatat!');
      // Reset form
      setTransferItems([{ product_id: '', qty: '' }]);
      setPassword('');
      if (user?.role !== 'STAF_CABANG') {
        setFromOutlet('');
      }
      setToOutlet('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses transfer cabang');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-richisam-orange" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Transfer Antar Cabang</h1>
        <p className="text-muted mt-1">Pindahkan stok fisik antar cabang secara instan</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-line p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Outlet */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Cabang Asal</label>
              <select
                value={fromOutlet}
                onChange={(e) => setFromOutlet(e.target.value)}
                disabled={user?.role === 'STAF_CABANG'}
                className="w-full px-4 py-3 bg-cream border border-line rounded-xl focus:outline-none focus:border-richisam-orange disabled:opacity-50"
              >
                <option value="">Pilih Cabang Asal</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>

            {/* To Outlet */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Cabang Tujuan</label>
              <select
                value={toOutlet}
                onChange={(e) => setToOutlet(e.target.value)}
                className="w-full px-4 py-3 bg-cream border border-line rounded-xl focus:outline-none focus:border-richisam-orange"
              >
                <option value="">Pilih Cabang Tujuan</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <h3 className="text-sm font-semibold text-ink mb-4">Item Transfer</h3>
            
            <div className="space-y-4">
              {transferItems.map((item, index) => (
                <div key={index} className="flex flex-col gap-2 w-full">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                    <div className="flex-1 w-full">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full px-4 py-3 bg-cream border border-line rounded-xl focus:outline-none focus:border-richisam-orange"
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
                        className="w-full px-4 py-3 bg-cream border border-line rounded-xl focus:outline-none focus:border-richisam-orange"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRadar(index, item.product_id)}
                        disabled={!item.product_id}
                        className="text-richisam-orange hover:bg-orange-50 font-medium p-3 rounded-xl border border-richisam-orange/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                        title="Cek Ketersediaan Stok Lintas Cabang"
                      >
                        <Radar className="w-5 h-5" />
                      </button>
                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-600 font-medium p-3 bg-red-50 rounded-xl"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {activeRadar?.index === index && (
                    <div className="w-full mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in relative overflow-hidden shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-ink flex items-center gap-2">
                          <Radar className="w-4 h-4 text-richisam-orange" /> Radar Stok Lintas Cabang
                        </h4>
                        <button type="button" onClick={() => setActiveRadar(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {radarLoading ? (
                        <div className="flex justify-center py-4">
                          <RefreshCw className="w-6 h-6 animate-spin text-richisam-orange" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {radarData.length > 0 ? radarData.map(r => {
                            const isSafe = r.qty_current > r.min_qty;
                            return (
                              <div key={r.outlet_id} className={`p-3 rounded-lg border ${isSafe ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'} flex justify-between items-center`}>
                                <div>
                                  <div className="font-medium text-sm text-ink">{r.outlet_name}</div>
                                  <div className="text-xs text-muted">Batas Aman: {r.min_qty}</div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold text-lg ${isSafe ? 'text-green-600' : 'text-red-600'}`}>{r.qty_current}</div>
                                  <div className="text-[10px] uppercase font-bold tracking-wider">{isSafe ? 'Aman' : 'Kritis'}</div>
                                </div>
                              </div>
                            )
                          }) : (
                            <div className="col-span-full text-center text-sm text-muted py-2">Tidak ada data stok untuk produk ini.</div>
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
              className="mt-4 text-richisam-orange font-semibold hover:underline"
            >
              + Tambah Item
            </button>
          </div>

          <div className="border-t border-line pt-6 bg-red-50/50 -mx-6 px-6 pb-6 rounded-b-2xl">
            <div className="flex items-start gap-3 mb-4 mt-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <p className="font-semibold mb-1">Otorisasi Transfer</p>
                <p>Transfer antar cabang akan memotong stok Cabang Asal dan menambah stok Cabang Tujuan secara instan. Masukkan PIN/Password untuk konfirmasi.</p>
              </div>
            </div>
            
            <div className="max-w-sm">
              <input
                type="password"
                placeholder="Masukkan PIN / Password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-richisam-orange hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Proses Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Transfer;
