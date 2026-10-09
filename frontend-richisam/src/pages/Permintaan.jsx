import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { PackagePlus, Search, Plus, Filter, RefreshCw, FileText, X, AlertTriangle, Check } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Permintaan = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ product_id: '', qty_requested: '' });
  const [updateData, setUpdateData] = useState({ status: '', qty_approved: '' });
  
  // Emergency Form State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyData, setEmergencyData] = useState({ outlet_id: '', product_id: '', qty: '', password: '' });
  const [outlets, setOutlets] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/requests${filter !== 'ALL' ? `?status=${filter}` : ''}`);
      setTickets(res?.data?.data || res?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data permintaan');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products');
      setProducts(res?.data?.data || res?.data || []);
    } catch (e) {}
  };

  const fetchOutlets = async () => {
    try {
      const res = await axiosClient.get('/outlets');
      setOutlets(res?.data?.data || res?.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTickets();
    fetchProducts();
    if (user?.role === 'ADMIN_PUSAT') {
      fetchOutlets();
    }
  }, [filter]);

  const openEmergencyModal = () => {
    setEmergencyData({ outlet_id: '', product_id: '', qty: '', password: '' });
    setIsEmergencyModalOpen(true);
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!emergencyData.outlet_id || !emergencyData.product_id || !emergencyData.qty || !emergencyData.password) {
      toast.error('Mohon lengkapi semua field termasuk PIN/Password');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post('/requests/emergency', {
        outlet_id: parseInt(emergencyData.outlet_id),
        items: [{
          product_id: parseInt(emergencyData.product_id),
          qty: parseInt(emergencyData.qty)
        }],
        password: emergencyData.password
      });
      toast.success('Pengambilan Darurat Berhasil!');
      setIsEmergencyModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses pengambilan darurat');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({ product_id: '', qty_requested: '' });
    setIsModalOpen(true);
  };

  const openDetailModal = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateData({ 
      status: ticket.status === 'DIAJUKAN' ? 'DIPROSES' : (ticket.status === 'DIPROSES' ? 'DIKIRIM' : 'SELESAI'), 
      qty_approved: ticket.qty_approved || ticket.qty_requested 
    });
    setIsDetailModalOpen(true);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.product_id || formData.qty_requested <= 0) return toast.error('Silakan lengkapi form');
    setSubmitting(true);
    try {
      await axiosClient.post('/requests', {
        product_id: parseInt(formData.product_id),
        qty_requested: parseInt(formData.qty_requested)
      });
      toast.success('Tiket permintaan berhasil dibuat');
      setIsModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!updateData.status) return toast.error('Silakan pilih status');
      
      const payload = { status: updateData.status };
      if (updateData.status === 'DIPROSES' || updateData.status === 'DIKIRIM') {
         const qty = parseInt(updateData.qty_approved);
         if (!isNaN(qty)) {
           payload.qty_approved = qty;
         }
      }
      await axiosClient.put(`/requests/${selectedTicket.id}`, payload);
      toast.success('Status tiket berhasil diperbarui');
      setIsDetailModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memperbarui tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.kode_tiket?.toLowerCase().includes(q) || 
           t.product_name?.toLowerCase().includes(q) ||
           t.outlet_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-richisam-orange" />
            Permintaan Barang
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola tiket permintaan stok dari cabang ke pusat.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTickets} className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors" title="Muat Ulang">
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role === 'ADMIN_PUSAT' && (
            <button onClick={openEmergencyModal} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm">
              <AlertTriangle size={18} />
              Pengambilan Cito (Darurat)
            </button>
          )}
          {user?.role === 'STAF_CABANG' && (
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Buat Tiket
            </button>
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-4 justify-between items-center bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kode tiket atau produk..." className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white border border-line rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-richisam-orange/20">
              <option value="ALL">Semua Status</option>
              <option value="DIAJUKAN">Diajukan</option>
              <option value="DIPROSES">Diproses</option>
              <option value="DIKIRIM">Dikirim</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Kode Tiket</th>
                <th className="px-6 py-4">Produk</th>
                {user?.role !== 'STAF_CABANG' && <th className="px-6 py-4">Cabang</th>}
                <th className="px-6 py-4 text-center">Diminta</th>
                <th className="px-6 py-4 text-center">Disetujui</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{t.kode_tiket}</td>
                    <td className="px-6 py-4 text-ink/80">{t.product_name}</td>
                    {user?.role !== 'STAF_CABANG' && <td className="px-6 py-4 text-ink/80">{t.outlet_name}</td>}
                    <td className="px-6 py-4 text-center font-semibold text-ink">{t.qty_requested}</td>
                    <td className="px-6 py-4 text-center text-ink/80">{t.qty_approved || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-4 text-muted">{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDetailModal(t)} className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">
                        {(user?.role === 'STAF_CABANG' && t.status === 'DIKIRIM') || (user?.role !== 'STAF_CABANG' && t.status !== 'SELESAI') ? 'Proses' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada tiket permintaan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Emergency Request (CITO) */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border-2 border-red-500">
            <div className="flex items-center justify-between p-5 border-b border-line bg-red-50">
              <h2 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={20}/> Pengambilan Darurat (CITO)</h2>
              <button onClick={() => setIsEmergencyModalOpen(false)} className="text-muted hover:text-ink"><X size={20}/></button>
            </div>
            <form onSubmit={handleEmergencySubmit} className="p-5 space-y-4">
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm mb-4 border border-red-200">
                Fitur ini akan langsung memotong stok Gudang Pusat dan mencatatnya sebagai transaksi <b>SELESAI</b> tanpa persetujuan lebih lanjut. Gunakan hanya saat keadaan darurat.
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Cabang Yang Meminta</label>
                <select required value={emergencyData.outlet_id} onChange={e => setEmergencyData({...emergencyData, outlet_id: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                  <option value="">Pilih Cabang</option>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Pilih Produk</label>
                <select required value={emergencyData.product_id} onChange={e => setEmergencyData({...emergencyData, product_id: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                  <option value="">Pilih Produk</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.kode} - {p.nama} ({p.satuan})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Jumlah Fisik Diambil (Sesuai Satuan Di Atas)</label>
                <input type="number" required min="1" value={emergencyData.qty} onChange={e => setEmergencyData({...emergencyData, qty: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500" placeholder="Masukkan jumlah"/>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-bold text-red-700 flex items-center gap-2">
                   Otorisasi Admin Gudang
                </label>
                <input type="password" required value={emergencyData.password} onChange={e => setEmergencyData({...emergencyData, password: e.target.value})} className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500" placeholder="Masukkan password Anda sebagai Tanda Tangan Digital"/>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-line mt-6">
                <button type="button" onClick={() => setIsEmergencyModalOpen(false)} className="px-4 py-2 text-muted hover:text-ink font-medium">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                  {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                  Sahkan Pengambilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Buat Tiket Permintaan</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Produk</label>
                <select required value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Jumlah Diminta</label>
                <input required type="number" min="1" value={formData.qty_requested} onChange={e => setFormData({...formData, qty_requested: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
              </div>
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Kirim Tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail / Process */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Detail Tiket {selectedTicket.kode_tiket}</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            
            <div className="p-5">
              <div className="mb-4 text-sm text-ink/80 space-y-1 bg-cream p-3 rounded-lg border border-line">
                <p><span className="font-medium text-ink">Cabang:</span> {selectedTicket.outlet_name}</p>
                <p><span className="font-medium text-ink">Produk:</span> {selectedTicket.product_name}</p>
                <p><span className="font-medium text-ink">Diminta:</span> {selectedTicket.qty_requested}</p>
                <p><span className="font-medium text-ink">Disetujui:</span> {selectedTicket.qty_approved || '-'}</p>
                <p><span className="font-medium text-ink">Status Saat Ini:</span> <StatusBadge status={selectedTicket.status} /></p>
              </div>

              {/* Tampilkan form update jika user berhak mengupdate status */}
              {user?.role === 'STAF_CABANG' ? (
                selectedTicket.status === 'DIKIRIM' ? (
                  <form onSubmit={handleUpdateStatus} className="space-y-4">
                    <p className="text-sm font-medium text-ink">Terima Barang & Selesaikan Tiket?</p>
                    <input type="hidden" value="SELESAI" />
                    <button type="submit" disabled={submitting} className="w-full px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {submitting ? 'Memproses...' : 'Tandai Selesai (Barang Diterima)'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted text-center mt-4">Menunggu proses dari pusat.</p>
                )
              ) : (
                selectedTicket.status !== 'SELESAI' ? (
                  <form onSubmit={handleUpdateStatus} className="space-y-4 mt-2">
                    <div className="border-t border-line pt-4">
                      <label className="block text-sm font-medium text-ink mb-1">Ubah Status</label>
                      <select required value={updateData.status} onChange={e => setUpdateData({...updateData, status: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange mb-3">
                        <option value="DIPROSES">DIPROSES</option>
                        <option value="DIKIRIM">DIKIRIM</option>
                      </select>

                      <label className="block text-sm font-medium text-ink mb-1">Jumlah Disetujui</label>
                      <input required type="number" min="0" value={updateData.qty_approved} onChange={e => setUpdateData({...updateData, qty_approved: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                        {submitting ? 'Menyimpan...' : 'Simpan Update'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-green-600 text-center font-medium mt-4">Tiket ini telah diselesaikan.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    'DIAJUKAN': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'DIPROSES': 'bg-blue-50 text-blue-700 border-blue-200',
    'DIKIRIM': 'bg-purple-50 text-purple-700 border-purple-200',
    'SELESAI': 'bg-green-50 text-green-700 border-green-200',
  };
  
  const className = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border uppercase ${className}`}>
      {status}
    </span>
  );
};

export default Permintaan;
