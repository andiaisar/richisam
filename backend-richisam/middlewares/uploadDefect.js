const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Memastikan folder penyimpanan ada
const uploadDir = 'public/uploads/defects/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Memberikan nama unik pada file (contoh: defect-1678901234-567.jpg)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'defect-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter jenis file
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Hanya file gambar (.jpg, .jpeg, .png) yang diperbolehkan!'));
};

// Inisialisasi upload multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal ukuran 2MB
  fileFilter: fileFilter
});

module.exports = upload;
