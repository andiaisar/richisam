import useAuthStore from '../store/useAuthStore';
import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Users as UsersIcon, Search, Plus, RefreshCw, FileText, X, Key, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const Users = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({ nama: '', username: '', password: '', role: 'STAF_CABANG', outlet_id: '', is_active: true });
  const [resetData, setResetData] = useState({ password: '' });
  const [showResetPass, setShowResetPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/users');
      const raw = res?.data?.data;
      const list = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setUsers(list);
    } catch (e) {
      toast.error('Gagal mengambil data user');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await axiosClient.get('/outlets');
      const list = res?.data?.data || res?.data || [];
      setOutlets(Array.isArray(list) ? list : []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({
      nama: '',
      username: '',
      password: '',
      role: 'STAF_CABANG',
      outlet_id: outlets.length > 0 ? String(outlets[0].id) : '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      nama: user.nama,
      username: user.username,
      role: user.role,
      outlet_id: user.outlet_id ? String(user.outlet_id) : '',
      is_active: user.is_active
    });
    setIsModalOpen(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setResetData({ password: '' });
    setShowResetPass(false);
    setIsResetModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      payload.outlet_id = payload.outlet_id ? parseInt(payload.outlet_id) : null;
      if (payload.role === 'OWNER') {
        payload.outlet_id = null;
      } else if (payload.role === 'STAF_CABANG' && !payload.outlet_id) {
        toast.error('Pilih cabang / penempatan untuk staf outlet');
        setSubmitting(false);
        return;
      }

      if (selectedUser) {
        await axiosClient.put(`/users/${selectedUser.id}`, payload);
        if (selectedUser.is_active !== payload.is_active) {
          await axiosClient.patch(`/users/${selectedUser.id}/status`, { is_active: payload.is_active });
        }
        toast.success('Data user berhasil diperbarui');
      } else {
        await axiosClient.post('/users', payload);
        toast.success('User baru berhasil ditambahkan');
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
    if (!resetData.password || resetData.password.length < 6) {
      return toast.error('Password minimal 6 karakter');
    }
    setSubmitting(true);
    try {
      await axiosClient.patch(`/users/${selectedUser.id}/reset-password`, resetData);
      toast.success('Password pengguna berhasil diubah');
      setIsResetModalOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      const res = await axiosClient.delete(`/users/${userToDelete.id}`);
      toast.success(res?.data?.message || 'Pengguna berhasil dihapus');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const userList = Array.isArray(users) ? users : [];
  const filteredUsers = userList.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.nama?.toLowerCase().includes(q) || 
           u.username?.toLowerCase().includes(q) ||
           u.outlet_name?.toLowerCase().includes(q) ||
           (u.role === 'OWNER' && 'semua unit pusat owner'.includes(q));
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors" title="Muat Ulang">
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-medium transition-colors shadow-sm cursor-pointer">
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
              placeholder="Cari nama, username, atau cabang..."
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
                <th className="px-6 py-4">Penempatan Cabang</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink">{u.nama}</td>
                    <td className="px-6 py-4 text-ink/80 font-mono text-xs">{u.username}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        if (u.role === 'OWNER') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border uppercase bg-purple-950/40 text-purple-300 border-purple-500/40">
                              OWNER
                            </span>
                          );
                        }
                        if (u.role === 'ADMIN_PUSAT') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border uppercase bg-amber-950/40 text-amber-300 border-amber-500/40">
                              ADMIN PUSAT
                            </span>
                          );
                        }
                        const isCK = u.outlet_id === 1 || u.outlet_name?.toLowerCase().includes('central kitchen') || u.outlet_name?.toLowerCase().includes('ck');
                        if (isCK) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border uppercase bg-[#F9610D]/20 text-[#F9610D] border-[#F9610D]/40">
                              STAF CENTRAL KITCHEN (CK)
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border uppercase bg-sky-950/40 text-sky-300 border-sky-500/40">
                            STAF OUTLET
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        if (u.role === 'OWNER') {
                          return (
                            <span className="text-purple-400 font-medium text-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"/>
                              Semua Unit / Pusat
                            </span>
                          );
                        }
                        if (u.outlet_name) {
                          const isCK = u.outlet_id === 1 || u.outlet_name.toLowerCase().includes('central kitchen') || u.outlet_name.toLowerCase().includes('ck');
                          return (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink text-sm">{u.outlet_name}</span>
                              {isCK && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F9610D]/10 text-[#F9610D] border border-[#F9610D]/30">
                                  Gudang Pusat
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <span className="text-muted text-xs italic">Belum ditentukan</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>Aktif</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1.5 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"/>Nonaktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => openResetModal(u)} 
                          className="text-[#FFCE00] hover:text-[#e5b800] font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer" 
                          title="Ubah Password Pengguna"
                        >
                          <Key size={14} />
                          <span>Ubah Password</span>
                        </button>
                        <button 
                          onClick={() => openEditModal(u)} 
                          className="text-[#F9610D] hover:text-[#d9530a] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        {u.id !== user?.id && (
                          <button 
                            onClick={() => openDeleteModal(u)} 
                            className="text-rose-400 hover:text-rose-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={14} />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
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

        {/* Komponen Pagination 15 Data Per Halaman */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg">{selectedUser ? 'Edit User & Penempatan' : 'Tambah User Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-ink">Username</label>
                  {selectedUser && (
                    <span className="text-[10px] text-stone-400 bg-stone-800/80 px-1.5 py-0.5 rounded border border-stone-700">
                      Terkunci (Audit Trail)
                    </span>
                  )}
                </div>
                <input 
                  required 
                  type="text" 
                  value={formData.username} 
                  readOnly={!!selectedUser} 
                  placeholder={selectedUser ? '' : 'Contoh: btp_rizal, pk3_wahyu, ald_fajar, ck_ahmad'}
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  className={`w-full px-4 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange ${selectedUser ? 'bg-cream/50 text-muted cursor-not-allowed' : 'bg-white'}`} 
                />
                {!selectedUser && (
                  <p className="text-[11px] text-muted mt-1">
                    Saran Opsi B: Format <span className="font-mono text-richisam-orange">&lt;kode_outlet&gt;_&lt;nama&gt;</span> (misal: <span className="font-mono">btp_rizal</span>, <span className="font-mono">pk3_wahyu</span>, <span className="font-mono">ald_fajar</span>, <span className="font-mono">ck_ahmad</span>)
                  </p>
                )}
              </div>
              {!selectedUser && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Password Awal</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange" placeholder="Minimal 6 karakter" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Peran (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange">
                  <option value="STAF_CABANG">Staf Outlet / Staf Central Kitchen (CK)</option>
                  <option value="ADMIN_PUSAT">Admin Pusat</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              {formData.role !== 'OWNER' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-ink">
                      Penempatan Cabang / Outlet {formData.role === 'STAF_CABANG' && <span className="text-rose-500">*</span>}
                    </label>
                    {selectedUser && (
                      <span className="text-[11px] text-[#F9610D] font-medium">
                        Bisa dipindah tugaskan
                      </span>
                    )}
                  </div>
                  <select 
                    required={formData.role === 'STAF_CABANG'} 
                    value={formData.outlet_id} 
                    onChange={e => setFormData({...formData, outlet_id: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange"
                  >
                    <option value="">-- Pilih Penempatan (Cabang / Central Kitchen) --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.nama} {o.tipe === 'PUSAT' ? '(Pusat / CK)' : '(Cabang Outlet)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted mt-1">
                    {formData.role === 'ADMIN_PUSAT'
                      ? 'Admin Pusat umumnya ditugaskan di Central Kitchen (CK) atau kantor operasional.'
                      : 'Pilih cabang tempat staf bertugas. Jika staf dipindahtugaskan ke cabang lain, cukup ubah pilihan cabang ini.'}
                  </p>
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-richisam-orange focus:ring-richisam-orange cursor-pointer" />
                  <label htmlFor="isActive" className="text-sm font-medium text-ink cursor-pointer select-none">Akun Aktif</label>
                </div>
              )}
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink cursor-pointer">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50 cursor-pointer">
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Password Pengguna */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2">
                <Key className="text-[#FFCE00]" size={20} />
                Ubah Password User
              </h2>
              <button onClick={() => setIsResetModalOpen(false)} className="text-muted hover:text-ink cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-sm text-muted">
                Atur ulang password untuk akun <strong>{selectedUser?.nama}</strong> (<span className="font-mono text-xs text-ink">{selectedUser?.username}</span>).
              </p>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Password Baru</label>
                <div className="relative">
                  <input 
                    required 
                    type={showResetPass ? 'text' : 'password'} 
                    value={resetData.password} 
                    onChange={e => setResetData({password: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange pr-10" 
                    placeholder="Minimal 6 karakter" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                  >
                    {showResetPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink cursor-pointer">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-bold bg-richisam-orange text-white rounded-lg hover:bg-[#d9530a] disabled:opacity-50 cursor-pointer">
                  {submitting ? 'Memproses...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus User */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1A1412] border border-[#382E28] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-white animate-scale-up">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-extrabold text-white">Konfirmasi Hapus Pengguna</h3>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun <strong className="text-white font-bold">{userToDelete.nama}</strong> (<span className="font-mono text-stone-300">@{userToDelete.username}</span>)?
              </p>
              <p className="text-[11px] text-stone-500 mt-2 bg-[#140F0D] p-2.5 rounded-xl border border-[#2D241E]">
                * Jika pengguna ini memiliki riwayat mutasi/transaksi di database, akun akan otomatis dinonaktifkan demi menjaga integritas data audit.
              </p>
            </div>
            <div className="p-4 border-t border-[#2D241E] flex items-center justify-end gap-3 bg-[#16110F]">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Users;
