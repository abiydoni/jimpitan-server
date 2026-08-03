"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApk = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Pastikan folder tujuan ada
const uploadDir = path_1.default.join(__dirname, '../../uploads/apks');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Konfigurasi Multer untuk penyimpanan file
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate nama file unik agar tidak bentrok, misalnya: jimpitan-update-1691234567.apk
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `jimpitan-update-${uniqueSuffix}${ext}`);
    }
});
// Inisialisasi middleware multer (hanya menerima file dengan nama field 'apk')
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Maksimal 100MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.android.package-archive' || path_1.default.extname(file.originalname).toLowerCase() === '.apk' || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        }
        else {
            cb(new Error('Hanya file .apk yang diperbolehkan!'));
        }
    }
}).single('apk');
const uploadApk = (req, res) => {
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
exports.uploadApk = uploadApk;
