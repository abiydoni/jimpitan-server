"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToDrive = exports.getOrCreateFolder = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getDriveService = () => {
    const clientId = process.env.GDRIVE_CLIENT_ID;
    const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
    // Hanya gunakan OAuth2 jika credentials valid (bukan placeholder 'xxx')
    const isValidOAuth = clientId && clientSecret && refreshToken &&
        !clientId.includes('xxx') && !clientSecret.includes('xxx') && !refreshToken.includes('xxx');
    if (isValidOAuth) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        return googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
    }
    // Fallback ke Service Account (serviceAccountKey.json)
    const keyPath = path_1.default.resolve(__dirname, '../../serviceAccountKey.json');
    if (!fs_1.default.existsSync(keyPath)) {
        throw new Error('File serviceAccountKey.json tidak ditemukan.');
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return googleapis_1.google.drive({ version: 'v3', auth });
};
const getOrCreateFolder = async (folderName, parentFolderId) => {
    const drive = getDriveService();
    try {
        const res = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        };
        const folderRes = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });
        return folderRes.data.id;
    }
    catch (error) {
        console.error('❌ Gagal mencari/membuat folder di GDrive:', error);
        throw error;
    }
};
exports.getOrCreateFolder = getOrCreateFolder;
/**
 * Mengunggah file ke Google Drive (ke dalam folder tertentu).
 * @param filePath Path lokal ke file yang akan diunggah
 * @param folderId ID Folder Google Drive tujuan
 * @param customFileName (Opsional) Nama file custom saat diunggah
 * @returns Metadata file yang berhasil diunggah
 */
const uploadFileToDrive = async (filePath, folderId, customFileName) => {
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`File lokal tidak ditemukan: ${filePath}`);
    }
    const drive = getDriveService();
    const fileName = customFileName || path_1.default.basename(filePath);
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
            supportsAllDrives: true,
        });
        return response.data;
    }
    catch (error) {
        console.error('❌ Gagal mengunggah ke Google Drive:', error);
        throw error;
    }
};
exports.uploadFileToDrive = uploadFileToDrive;
