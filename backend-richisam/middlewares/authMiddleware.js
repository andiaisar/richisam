const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Harap login terlebih dahulu.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = decoded; // { id, role, outlet_id }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
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
    // Force override body
    if (req.body) req.body.outlet_id = outlet_id;
    // Force override query
    if (req.query) req.query.outlet_id = outlet_id;
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
