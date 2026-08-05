"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSystemCache = exports.backupDatabase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbBackup_1 = require("../utils/dbBackup");
// 1. BACKUP DATABASE
// 1. BACKUP DATABASE (DARI TOMBOL WEB)
const backupDatabase = async (req, res) => {
    try {
        const filePath = await (0, dbBackup_1.generateDatabaseBackup)();
        const fileName = path_1.default.basename(filePath);
        // Download file ke client
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // Hapus file lokal setelah di-download
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
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
