"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSystemCache = exports.triggerGDriveBackup = exports.backupDatabase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbBackup_1 = require("../utils/dbBackup");
const gdriveService_1 = require("../services/gdriveService");
// 1. BACKUP DATABASE (DARI TOMBOL WEB DOWNLOAD)
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
// 1b. TRIGGER BACKUP DATABASE LANGSUNG KE GOOGLE DRIVE
const triggerGDriveBackup = async (req, res) => {
    try {
        const gdriveFolderId = process.env.GDRIVE_FOLDER_ID;
        if (!gdriveFolderId || gdriveFolderId === 'xxxxxx') {
            res.status(400).json({ success: false, message: 'GDRIVE_FOLDER_ID belum dikonfigurasi di environment (.env).' });
            return;
        }
        const currentMonthYear = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }).replace(/ /g, '-');
        const targetFolderId = await (0, gdriveService_1.getOrCreateFolder)(currentMonthYear, gdriveFolderId);
        const currentDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
        const customFileName = `jimpitan-${currentDate}.sql`;
        const sqlFilePath = await (0, dbBackup_1.generateDatabaseBackup)();
        const uploadResult = await (0, gdriveService_1.uploadFileToDrive)(sqlFilePath, targetFolderId, customFileName);
        if (fs_1.default.existsSync(sqlFilePath)) {
            fs_1.default.unlinkSync(sqlFilePath);
        }
        res.json({
            success: true,
            message: 'Backup database berhasil diunggah ke Google Drive!',
            data: uploadResult
        });
    }
    catch (error) {
        console.error('❌ Gagal backup manual ke Google Drive:', error);
        res.status(500).json({ success: false, message: error?.message || 'Gagal backup ke Google Drive' });
    }
};
exports.triggerGDriveBackup = triggerGDriveBackup;
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
