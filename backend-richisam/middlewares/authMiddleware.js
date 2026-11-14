const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Harap login terlebih dahulu.' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
  }

  try {
    // Token yang sudah terbit tidak boleh tetap berlaku setelah akun dinonaktifkan/dihapus.
    // Role & penempatan outlet juga diambil dari data terbaru agar perubahan admin langsung berlaku.
    const result = await pool.query('SELECT role, outlet_id, is_active FROM users WHERE id = $1', [decoded.id]);
    const current = result && result.rows && result.rows[0];
    if (!current || current.is_active === false) {
      return res.status(401).json({ success: false, message: 'Akun Anda sudah dinonaktifkan atau dihapus. Silakan hubungi admin.' });
    }
    req.user = { ...decoded, role: current.role, outlet_id: current.outlet_id }; // { id, role, outlet_id, ... }
    return next();
  } catch (err) {
    return next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Akses ditolak. Hanya untuk role: ${roles.join(', ')}`
    });
  }
  next();
};

const enforceOutletScope = (req, res, next) => {
  if (req.user && req.user.role === 'STAF_CABANG') {
    const outlet_id = req.user.outlet_id;
    const isCK = Number(outlet_id) === 1;
    const isRequestRoute = (req.baseUrl && req.baseUrl.includes('requests')) || (req.originalUrl && req.originalUrl.includes('/api/requests'));

    // Central Kitchen (outlet_id === 1) adalah penyedia/pusat yang melayani permintaan dari seluruh cabang.
    // Jangan batasi query/body rute requests untuk Staf CK agar dapat melihat & memproses semua tiket masuk.
    if (!isCK || !isRequestRoute) {
      if (req.body && typeof req.body === 'object') req.body.outlet_id = outlet_id;
      // Express 5: `req.query` adalah getter hanya-baca (dihitung ulang dari URL setiap diakses),
      // sehingga `req.query.outlet_id = ...` diabaikan. Timpa dengan properti milik request sendiri.
      Object.defineProperty(req, 'query', {
        value: { ...(req.query || {}), outlet_id },
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  enforceOutletScope,
  // Alias lama untuk mencegah crash sementara pada rute lain
  verifyToken: authenticate,
  authorizeRoles: authorize,
  bolehAksesCabang: () => true
};
