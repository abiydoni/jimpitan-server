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

export const getOrCreateFolder = async (folderName: string, parentFolderId: string): Promise<string> => {
  const drive = getDriveService();
  
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id as string;
    }
    
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };
    
    const folderRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    
    return folderRes.data.id as string;
  } catch (error) {
    console.error('❌ Gagal mencari/membuat folder di GDrive:', error);
    throw error;
  }
};

/**
 * Mengunggah file ke Google Drive (ke dalam folder tertentu).
 * @param filePath Path lokal ke file yang akan diunggah
 * @param folderId ID Folder Google Drive tujuan
 * @param customFileName (Opsional) Nama file custom saat diunggah
 * @returns Metadata file yang berhasil diunggah
 */
export const uploadFileToDrive = async (filePath: string, folderId: string, customFileName?: string) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File lokal tidak ditemukan: ${filePath}`);
  }

  const drive = getDriveService();
  const fileName = customFileName || path.basename(filePath);

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
