const NotificationService = require('../services/notificationService');
const pool = require('../config/db');

const getEffectiveOutletId = async (user) => {
  let outlet_id = user?.outlet_id;
  if (!outlet_id) {
    const userRes = await pool.query('SELECT outlet_id FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length > 0) outlet_id = userRes.rows[0].outlet_id;
  }
  if (!outlet_id && (user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER')) {
    const pusat = await pool.query('SELECT id FROM outlets WHERE tipe = $1 AND is_active = true LIMIT 1', ['PUSAT']);
    if (pusat.rows.length > 0) outlet_id = pusat.rows[0].id;
  }
  return outlet_id;
};

exports.getNotifications = async (req, res) => {
  try {
    const { is_read, page, limit } = req.query;
    const outlet_id = await getEffectiveOutletId(req.user);

    if (!outlet_id && req.user.role !== 'ADMIN_PUSAT' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'User tidak memiliki akses outlet' });
    }

    const result = await NotificationService.getNotifications(outlet_id, is_read, page, limit);
    res.json({ 
      success: true, 
      message: 'Daftar notifikasi', 
      data: result.data, 
      meta: result.meta,
      count: result.meta?.total || 0
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const outlet_id = await getEffectiveOutletId(req.user);
    if (!outlet_id) return res.json({ success: true, message: 'Count', data: 0, count: 0 });

    const count = await NotificationService.getUnreadCount(outlet_id);
    res.json({ success: true, message: 'Unread count', data: count, count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const outlet_id = await getEffectiveOutletId(req.user);
    if (!outlet_id) return res.status(403).json({ success: false, message: 'Tidak ada akses outlet' });

    const notif = await NotificationService.markAsRead(parseInt(req.params.id), outlet_id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
    res.json({ success: true, message: 'Telah dibaca', data: notif });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const outlet_id = await getEffectiveOutletId(req.user);
    if (!outlet_id) return res.status(403).json({ success: false, message: 'Tidak ada akses outlet' });
    
    await NotificationService.markAllAsRead(outlet_id);
    res.json({ success: true, message: 'Semua telah dibaca' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
