const NotificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const { is_read, page, limit } = req.query;
    const outlet_id = req.user.outlet_id; // Dari token STAF_CABANG/ADMIN_PUSAT (yg terhubung ke pusat)
    
    if (!outlet_id) return res.status(403).json({ success: false, message: 'User tidak memiliki akses outlet' });

    const result = await NotificationService.getNotifications(outlet_id, is_read, page, limit);
    res.json({ success: true, message: 'Daftar notifikasi', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const outlet_id = req.user.outlet_id;
    if (!outlet_id) return res.json({ success: true, message: 'Count', data: 0 });

    const count = await NotificationService.getUnreadCount(outlet_id);
    res.json({ success: true, message: 'Unread count', data: count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const outlet_id = req.user.outlet_id;
    const notif = await NotificationService.markAsRead(parseInt(req.params.id), outlet_id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
    res.json({ success: true, message: 'Telah dibaca', data: notif });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const outlet_id = req.user.outlet_id;
    if (!outlet_id) return res.status(403).json({ success: false, message: 'Tidak ada akses' });
    
    await NotificationService.markAllAsRead(outlet_id);
    res.json({ success: true, message: 'Semua telah dibaca' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
