import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { PackageX, Search, Plus, Filter, RefreshCw, FileText, Image as ImageIcon, X, Upload } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Defect = () => {
  const { user } = useAuthStore();
  const [defects, setDefects] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(null);

  const [formData, setFormData] = useState({ product_id: '', qty: '', tipe: 'RETUR', deskripsi: '' });
  const [fotoFile, setFotoFile] = useState(null);
  
  const [updateStatus, setUpdateStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDefects = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/defects${filter !== 'ALL' ? `?status=${filter}` : ''}`);
      setDefects(res.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data defect');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products');
      setProducts(res.data?.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchDefects();
    fetchProducts();
  }, [filter]);

  const openAddModal = () => {
    setFormData({ product_id: '', qty: '', tipe: 'RETUR', deskripsi: '' });
    setFotoFile(null);
    setIsModalOpen(true);
  };

  const openDetailModal = (defect) => {
    setSelectedDefect(defect);
    setUpdateStatus(defect.status === 'BARU' ? 'DITINJAU' : defect.status === 'DITINJAU' ? 'SELESAI' : defect.status);
    setIsDetailModalOpen(true);
  };

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    if (!formData.product_id || formData.qty <= 0) return toast.error('Silakan lengkapi form');
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('product_id', formData.product_id);
      data.append('qty', formData.qty);
      data.append('tipe', formData.tipe);
      data.append('deskripsi', formData.deskripsi);
      if (fotoFile) {
        data.append('foto', fotoFile);
      }

      await axiosClient.post('/defects', data, {
        headers: { 'Content-Type': undefined }
      });
      toast.success('Laporan defect berhasil dikirim');
      setIsModalOpen(false);
      fetchDefects();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengirim laporan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosClient.put(`/defects/${selectedDefect.id}`, { status: updateStatus });
      toast.success('Status defect berhasil diperbarui');
      setIsDetailModalOpen(false);
      fetchDefects();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDefects = defects.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.product_name?.toLowerCase().includes(q) || 
           d.deskripsi?.toLowerCase().includes(q) ||
           d.outlet_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <PackageX className="h-6 w-6 text-richisam-orange" />
            Laporan Defect
          </h1>
          <p className="mt-1 text-sm text-muted">Daftar laporan barang rusak atau cacat dari cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchDefects} className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors" title="Muat Ulang">
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {user?.role === 'STAF_CABANG' && (
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
              <Plus size={18} />
              Buat Laporan
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-4 justify-between items-center bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari produk atau keterangan..." className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white border border-line rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-richisam-orange/20">
              <option value="ALL">Semua Status</option>
              <option value="BARU">Baru</option>
              <option value="DITINJAU">Ditinjau</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Produk</th>
                {user?.role !== 'STAF_CABANG' && <th className="px-6 py-4">Cabang</th>}
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4 max-w-[200px]">Keterangan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dilaporkan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredDefects.length > 0 ? (
                filteredDefects.map((d) => (
                  <tr key={d.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4">
                      {d.foto_url ? (
                        <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${d.foto_url}`} target="_blank" rel="noreferrer">
                          <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${d.foto_url}`} alt="Defect" className="h-10 w-10 rounded-md object-cover border border-line hover:opacity-80 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-cream flex items-center justify-center border border-line text-muted">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">{d.product_name}</td>
                    {user?.role !== 'STAF_CABANG' && <td className="px-6 py-4 text-ink/80">{d.outlet_name}</td>}
                    <td className="px-6 py-4 font-semibold text-ink">{d.qty}</td>
                    <td className="px-6 py-4 text-ink/70 truncate max-w-[200px]" title={d.deskripsi || d.keterangan}>
                      {d.deskripsi || d.keterangan || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4 text-muted">{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDetailModal(d)} className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">
                        {(user?.role !== 'STAF_CABANG' && d.status !== 'SELESAI') ? 'Proses' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada laporan defect.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Defect */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Buat Laporan Defect</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDefect} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Produk</label>
                <select required value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-ink mb-1">Jumlah (Qty)</label>
                  <input required type="number" min="1" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-ink mb-1">Tipe</label>
                  <select required value={formData.tipe} onChange={e => setFormData({...formData, tipe: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                    <option value="RETUR">RETUR</option>
                    <option value="BUANG">BUANG</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Keterangan / Deskripsi</label>
                <textarea rows="2" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange resize-none" placeholder="Jelaskan detail kerusakan..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Foto Bukti (Opsional)</label>
                <div 
                  className="w-full px-4 py-3 border-2 border-dashed border-line rounded-lg flex flex-col items-center justify-center bg-cream/50 cursor-pointer hover:bg-cream transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="text-muted mb-1" />
                  <span className="text-xs text-muted font-medium">{fotoFile ? fotoFile.name : 'Klik untuk unggah foto'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={e => setFotoFile(e.target.files[0])}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail / Process */}
      {isDetailModalOpen && selectedDefect && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Detail Laporan Defect</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            
            <div className="p-5">
              <div className="mb-4 text-sm text-ink/80 space-y-2 bg-cream p-3 rounded-lg border border-line">
                <p><span className="font-medium text-ink">Cabang:</span> {selectedDefect.outlet_name}</p>
                <p><span className="font-medium text-ink">Produk:</span> {selectedDefect.product_name}</p>
                <p><span className="font-medium text-ink">Jumlah:</span> {selectedDefect.qty} ({selectedDefect.tipe})</p>
                <p><span className="font-medium text-ink">Keterangan:</span> {selectedDefect.deskripsi || selectedDefect.keterangan || '-'}</p>
                <p className="flex items-center gap-2"><span className="font-medium text-ink">Status:</span> <StatusBadge status={selectedDefect.status} /></p>
                {selectedDefect.foto_url && (
                   <div className="mt-3">
                     <span className="font-medium text-ink block mb-1">Foto Bukti:</span>
                     <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedDefect.foto_url}`} alt="Bukti" className="w-full h-auto max-h-40 object-contain rounded border border-line bg-white" />
                   </div>
                )}
              </div>

              {user?.role === 'ADMIN_PUSAT' && selectedDefect.status !== 'SELESAI' && (
                <form onSubmit={handleUpdateStatus} className="space-y-4 mt-2 border-t border-line pt-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Update Status</label>
                    <select required value={updateStatus} onChange={e => setUpdateStatus(e.target.value)} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                      <option value="DITINJAU">DITINJAU</option>
                      <option value="DISETUJUI">DISETUJUI</option>
                      <option value="DITOLAK">DITOLAK</option>
                      <option value="SELESAI">SELESAI</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                      {submitting ? 'Menyimpan...' : 'Simpan Update'}
                    </button>
                  </div>
                </form>
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
    'BARU': 'bg-red-50 text-red-700 border-red-200',
    'DITINJAU': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'SELESAI': 'bg-green-50 text-green-700 border-green-200',
  };
  
  const className = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border uppercase ${className}`}>
      {status}
    </span>
  );
};

export default Defect;
