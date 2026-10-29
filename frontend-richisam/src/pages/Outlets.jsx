import useAuthStore from '../store/useAuthStore';
import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Store, Search, Plus, RefreshCw, FileText, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Outlets = () => {
  const { user } = useAuthStore();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    tipe: 'CABANG',
    alamat: '',
    is_active: true
  });

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/outlets');
      setOutlets(res?.data?.data || res?.data || []);
    } catch {
      toast.error('Gagal mengambil data cabang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleOpenAdd = () => {
    setEditingOutlet(null);
    setFormData({ nama: '', tipe: 'CABANG', alamat: '', is_active: true });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      nama: outlet.nama || '',
      tipe: outlet.tipe || 'CABANG',
      alamat: outlet.alamat || '',
      is_active: outlet.is_active !== false
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveOutlet = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      return toast.error('Nama outlet wajib diisi');
    }
    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await axiosClient.post('/outlets', formData);
        toast.success('Outlet baru berhasil ditambahkan');
      } else if (editingOutlet) {
        await axiosClient.put(`/outlets/${editingOutlet.id}`, formData);
        toast.success('Data outlet berhasil diperbarui');
      }
      setIsModalOpen(false);
      fetchOutlets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data outlet');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOutlets = outlets.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.nama?.toLowerCase().includes(q) || 
           o.alamat?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Store className="h-6 w-6 text-richisam-orange" />
            Manajemen Outlet & Central Kitchen
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola unit outlet cabang dan Central Kitchen (CK).</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOutlets}
            className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {(user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER') && (
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={18} />
              Tambah Outlet
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line bg-cream/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama outlet..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Nama Outlet</th>
                <th className="px-6 py-4">Tipe Unit</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredOutlets.length > 0 ? (
                filteredOutlets.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{o.nama}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border uppercase ${o.tipe === 'PUSAT' ? 'badge-role-ck' : 'badge-role-outlet'}`}>
                        {o.tipe === 'PUSAT' ? 'CENTRAL KITCHEN (CK)' : 'OUTLET'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink/80 truncate max-w-xs">{o.alamat || '-'}</td>
                    <td className="px-6 py-4">
                      {o.is_active ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block"/>
                          Buka
                        </span>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 inline-block"/>
                          Tutup
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(o)}
                        className="btn-action-orange inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data cabang.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-line rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-cream/30">
              <h2 className="text-lg font-bold text-ink">
                {modalMode === 'add' ? 'Tambah Outlet Baru' : 'Edit Data Outlet'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOutlet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Nama Outlet / Unit
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Richisam Cabang Panakkukang"
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-richisam-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Tipe Unit
                </label>
                <select
                  value={formData.tipe}
                  onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-richisam-orange"
                >
                  <option value="CABANG">OUTLET CABANG</option>
                  <option value="PUSAT">CENTRAL KITCHEN (PUSAT)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Masukkan alamat lengkap outlet..."
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-richisam-orange"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="text-sm font-semibold text-ink">Status Operasional Aktif (Buka)</label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 accent-richisam-orange rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-richisam-orange hover:bg-[#d9530a] text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Outlets;
