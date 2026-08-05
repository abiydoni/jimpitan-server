import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Mendapatkan instance Google Drive API yang sudah terautentikasi
 * menggunakan serviceAccountKey.json yang sama dengan Firebase.
 */
const getDriveService = () => {
  const keyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  
  if (!fs.existsSync(keyPath)) {
    throw new Error('File serviceAccountKey.json tidak ditemukan.');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
};

/**
 * Mengunggah file ke Google Drive (ke dalam folder tertentu).
 * @param filePath Path lokal ke file yang akan diunggah
 * @param folderId ID Folder Google Drive tujuan
 * @returns Metadata file yang berhasil diunggah
 */
export const uploadFileToDrive = async (filePath: string, folderId: string) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File lokal tidak ditemukan: ${filePath}`);
  }

  const drive = getDriveService();
  const fileName = path.basename(filePath);

  const fileMetadata = {
    name: fileName,
    parents: [folderId], // Upload ke dalam folder ini
  };

  const media = {
    mimeType: 'application/sql',
    body: fs.createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Gagal mengunggah ke Google Drive:', error);
    throw error;
  }
};
