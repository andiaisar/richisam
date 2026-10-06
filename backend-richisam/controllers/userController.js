const { z } = require('zod');
const bcrypt = require('bcrypt');
const UserService = require('../services/userService');

const userSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum(['OWNER', 'ADMIN_PUSAT', 'STAF_CABANG']),
  outlet_id: z.number().nullable().optional(),
}).refine(data => {
  if (data.role === 'STAF_CABANG' && !data.outlet_id) return false;
  return true;
}, {
  message: 'Staf cabang wajib memiliki outlet_id',
  path: ['outlet_id']
});

const updateUserSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  role: z.enum(['OWNER', 'ADMIN_PUSAT', 'STAF_CABANG']),
  outlet_id: z.number().nullable().optional(),
}).refine(data => {
  if (data.role === 'STAF_CABANG' && !data.outlet_id) return false;
  return true;
}, {
  message: 'Staf cabang wajib memiliki outlet_id',
  path: ['outlet_id']
});

exports.getUsers = async (req, res) => {
  try {
    const { page, limit, role, outlet_id, search } = req.query;
    const result = await UserService.getUsers(page, limit, role, outlet_id, search);
    res.json({ success: true, message: 'Daftar pengguna', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    if (!parsed.data.password) {
      return res.status(400).json({ success: false, message: 'Password wajib diisi untuk pengguna baru' });
    }

    const exists = await UserService.getUserByUsername(parsed.data.username);
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
    }

    const password_hash = await bcrypt.hash(parsed.data.password, 10);
    const user = await UserService.createUser({ ...parsed.data, password_hash });

    res.status(201).json({ success: true, message: 'Pengguna berhasil dibuat', data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal membuat pengguna' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    const targetUser = await UserService.getUserById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

    const user = await UserService.updateUser(id, parsed.data);
    res.json({ success: true, message: 'Pengguna berhasil diperbarui', data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui pengguna' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active harus berupa boolean' });
    }

    // Admin tidak boleh menonaktifkan dirinya sendiri
    if (!is_active && req.user.id === id) {
      return res.status(403).json({ success: false, message: 'Anda tidak dapat menonaktifkan akun sendiri' });
    }

    const targetUser = await UserService.getUserById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

    const user = await UserService.updateStatus(id, is_active);
    res.json({ success: true, message: 'Status pengguna berhasil diperbarui', data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengubah status pengguna' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({ password: z.string().min(6, 'Password minimal 6 karakter') });
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    const targetUser = await UserService.getUserById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

    const password_hash = await bcrypt.hash(parsed.data.password, 10);
    await UserService.resetPassword(id, password_hash);

    res.json({ success: true, message: 'Password pengguna berhasil di-reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal me-reset password' });
  }
};
