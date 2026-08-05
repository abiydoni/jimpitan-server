"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSystemCache = exports.backupDatabase = void 0;
const child_process_1 = require("child_process");
const url_1 = require("url");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 1. BACKUP DATABASE
const backupDatabase = async (req, res) => {
    try {
        const dbUrlString = process.env.DATABASE_URL;
        if (!dbUrlString) {
            res.status(500).json({ success: false, message: 'DATABASE_URL tidak ditemukan di environment.' });
            return;
        }
        const dbUrl = new url_1.URL(dbUrlString);
        const host = dbUrl.hostname;
        const port = dbUrl.port || '3306';
        const user = dbUrl.username;
        const pass = dbUrl.password;
        const dbName = dbUrl.pathname.replace('/', '');
        // Direktori sementara untuk menyimpan file SQL
        const backupDir = path_1.default.join(process.cwd(), 'uploads', 'backups');
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const fileName = `backup-jimpitan-${timestamp}.sql`;
        const filePath = path_1.default.join(backupDir, fileName);
        // Command mysqldump
        const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} -p"${pass}" ${dbName} > "${filePath}"`;
        (0, child_process_1.exec)(dumpCmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup Error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal melakukan backup. Pastikan mysqldump terinstall di server.',
                    error: error.message
                });
            }
            // Download file ke client
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                }
                // Hapus file setelah di-download agar tidak menuhin disk
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            });
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.backupDatabase = backupDatabase;
// 2. CLEAR SYSTEM LOGS / CACHE
const clearSystemCache = async (req, res) => {
    try {
        // Sebagai contoh: Membersihkan folder uploads/temp jika ada
        const tempDir = path_1.default.join(process.cwd(), 'uploads', 'temp');
        let deletedCount = 0;
        if (fs_1.default.existsSync(tempDir)) {
            const files = fs_1.default.readdirSync(tempDir);
            for (const file of files) {
                const filePath = path_1.default.join(tempDir, file);
                if (fs_1.default.lstatSync(filePath).isFile()) {
                    fs_1.default.unlinkSync(filePath);
                    deletedCount++;
                }
            }
        }
        res.json({
            success: true,
            message: `Cache dan log sistem berhasil dibersihkan. (${deletedCount} file dihapus)`
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.clearSystemCache = clearSystemCache;
