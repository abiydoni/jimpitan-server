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
    // Memastikan protocol selalu https jika berjalan di production server
    const rawHost = req.headers['x-forwarded-host'] || req.get('host') || '';
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    // Hasil URL: https://jimpitan-server.appsbee.my.id/uploads/apks/nama-file.apk
    const fileUrl = `${protocol}://${host}/uploads/apks/${req.file.filename}`;

    // Bersihkan file APK lama (Maksimal 3 file)
    try {
      const files = fs.readdirSync(uploadDir);
      const apkFiles = files
        .filter(f => f.endsWith('.apk'))
        .map(f => {
          const filePath = path.join(uploadDir, f);
          const stat = fs.statSync(filePath);
          return { name: f, path: filePath, time: stat.mtime.getTime() };
        })
        .sort((a, b) => b.time - a.time); // Urutkan dari yang terbaru (descending)

      // Jika lebih dari 3, hapus sisanya (yang paling lama)
      if (apkFiles.length > 3) {
        const filesToDelete = apkFiles.slice(3);
        for (const fileToDelete of filesToDelete) {
          fs.unlinkSync(fileToDelete.path);
        }
      }
    } catch (cleanupError) {
      console.error('Gagal membersihkan file APK lama:', cleanupError);
    }

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
