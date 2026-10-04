const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan. Harap login terlebih dahulu.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id_user, role, id_cabang }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

// Batasi akses hanya untuk role tertentu. Pakai SETELAH verifyToken.
// Contoh: router.post('/', verifyToken, authorizeRoles('Superadmin'), handler)
const authorizeRoles = (...rolesDiizinkan) => (req, res, next) => {
  if (!req.user || !rolesDiizinkan.includes(req.user.role)) {
    return res.status(403).json({
      error: `Akses ditolak. Hanya untuk role: ${rolesDiizinkan.join(', ')}`
    });
  }
  next();
};

// Helper: apakah user boleh bertindak atas cabang tertentu?
// Superadmin → semua cabang; role lain → hanya cabangnya sendiri (dari token).
const bolehAksesCabang = (user, id_cabang) => {
  if (!user) return false;
  if (user.role === 'Superadmin') return true;
  return user.id_cabang != null && Number(user.id_cabang) === Number(id_cabang);
};

module.exports = { verifyToken, authorizeRoles, bolehAksesCabang };
