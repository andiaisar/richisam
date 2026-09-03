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

module.exports = { verifyToken };
