import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Users as UsersIcon, Search, Plus, RefreshCw, FileText, X, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ nama: '', username: '', password: '', role: 'STAF_CABANG', outlet_id: '', is_active: true });
  const [resetData, setResetData] = useState({ password: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/users');
      setUsers(res.data?.data || []);
    } catch (e) {
      toast.error('Gagal mengambil data user');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await axiosClient.get('/outlets');
      setOutlets(res.data?.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
  }, []);

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({ nama: '', username: '', password: '', role: 'STAF_CABANG', outlet_id: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      nama: user.nama,
      username: user.username,
      role: user.role,
      outlet_id: user.outlet_id || '',
      is_active: user.is_active
    });
    setIsModalOpen(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setResetData({ password: '' });
    setIsResetModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      payload.outlet_id = payload.outlet_id ? parseInt(payload.outlet_id) : null;
      if (payload.role !== 'STAF_CABANG') payload.outlet_id = null;

      if (selectedUser) {
        await axiosClient.put(`/users/${selectedUser.id}`, payload);
        if (selectedUser.is_active !== payload.is_active) {
          await axiosClient.patch(`/users/${selectedUser.id}/status`, { is_active: payload.is_active });
        }
        toast.success('User berhasil diperbarui');
      } else {
        await axiosClient.post('/users', payload);
        toast.success('User berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosClient.patch(`/users/${selectedUser.id}/reset-password`, resetData);
      toast.success('Password berhasil direset');
      setIsResetModalOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mereset password');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.nama?.toLowerCase().includes(q) || 
           u.username?.toLowerCase().includes(q) ||
           u.outlet_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-richisam-orange" />
            Manajemen User
          </h1>
          <p className="mt-1 text-sm text-muted">Kelola akun pengguna, peran, dan akses cabang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} />
            Tambah User
          </button>
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
              placeholder="Cari nama atau username..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Peran (Role)</th>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{u.nama}</td>
                    <td className="px-6 py-4 text-ink/80">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border uppercase bg-gray-50 border-gray-200 text-gray-700">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink/80">{u.outlet_name || '-'}</td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="text-green-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>Aktif</span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openResetModal(u)} className="text-richisam-merah-muda hover:text-red-700 font-medium text-sm transition-colors mr-4" title="Reset Password"><Key size={16} className="inline mr-1" />Reset</button>
                      <button onClick={() => openEditModal(u)} className="text-richisam-orange hover:text-richisam-merah-muda font-medium text-sm transition-colors">Edit</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada data user.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">{selectedUser ? 'Edit User' : 'Tambah User Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Username</label>
                <input required type="text" value={formData.username} readOnly={!!selectedUser} onChange={e => setFormData({...formData, username: e.target.value})} className={`w-full px-4 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange ${selectedUser ? 'bg-cream/50 text-muted cursor-not-allowed' : 'bg-white'}`} />
              </div>
              {!selectedUser && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Password</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Peran (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="STAF_CABANG">Staf Cabang</option>
                  <option value="ADMIN_PUSAT">Admin Pusat</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              {formData.role === 'STAF_CABANG' && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Pilih Cabang</label>
                  <select required value={formData.outlet_id} onChange={e => setFormData({...formData, outlet_id: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                    <option value="">-- Pilih Cabang --</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
                  </select>
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-richisam-orange focus:ring-richisam-orange" />
                  <label htmlFor="isActive" className="text-sm font-medium text-ink">Akun Aktif</label>
                </div>
              )}
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">Reset Password</h2>
              <button onClick={() => setIsResetModalOpen(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-sm text-muted mb-2">Reset password untuk <strong>{selectedUser?.nama}</strong>.</p>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Password Baru</label>
                <input required type="text" value={resetData.password} onChange={e => setResetData({password: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" placeholder="Minimal 6 karakter" />
              </div>
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-merah-muda text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {submitting ? 'Memproses...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Users;
