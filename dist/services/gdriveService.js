"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToDrive = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Mendapatkan instance Google Drive API yang sudah terautentikasi
 * menggunakan serviceAccountKey.json yang sama dengan Firebase.
 */
const getDriveService = () => {
    const keyPath = path_1.default.resolve(__dirname, '../../serviceAccountKey.json');
    if (!fs_1.default.existsSync(keyPath)) {
        throw new Error('File serviceAccountKey.json tidak ditemukan.');
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    return googleapis_1.google.drive({ version: 'v3', auth });
};
/**
 * Mengunggah file ke Google Drive (ke dalam folder tertentu).
 * @param filePath Path lokal ke file yang akan diunggah
 * @param folderId ID Folder Google Drive tujuan
 * @returns Metadata file yang berhasil diunggah
 */
const uploadFileToDrive = async (filePath, folderId) => {
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`File lokal tidak ditemukan: ${filePath}`);
    }
    const drive = getDriveService();
    const fileName = path_1.default.basename(filePath);
    const fileMetadata = {
        name: fileName,
        parents: [folderId], // Upload ke dalam folder ini
    };
    const media = {
        mimeType: 'application/sql',
        body: fs_1.default.createReadStream(filePath),
    };
    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink',
        });
        return response.data;
    }
    catch (error) {
        console.error('❌ Gagal mengunggah ke Google Drive:', error);
        throw error;
    }
};
exports.uploadFileToDrive = uploadFileToDrive;
