import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Pastikan folder tujuan ada
const uploadDir = path.join(__dirname, '../../uploads/apks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate nama file unik agar tidak bentrok, misalnya: jimpitan-update-1691234567.apk
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `jimpitan-update-${uniqueSuffix}${ext}`);
  }
});

// Inisialisasi middleware multer (hanya menerima file dengan nama field 'apk')
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Maksimal 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.android.package-archive' || path.extname(file.originalname).toLowerCase() === '.apk' || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .apk yang diperbolehkan!'));
    }
  }
}).single('apk');

export const uploadApk = (req: Request, res: Response) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File APK tidak ditemukan dalam request.' });
    }

    // Bangun URL statis berdasarkan origin server saat ini
    const protocol = req.protocol;
    const host = req.get('host');
    // Hasil URL: http://localhost:3000/uploads/apks/nama-file.apk
    const fileUrl = `${protocol}://${host}/uploads/apks/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'File APK berhasil diunggah',
      data: {
        fileUrl: fileUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  });
};
