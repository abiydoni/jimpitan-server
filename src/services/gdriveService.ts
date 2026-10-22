import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const getDriveService = () => {
  const clientId = process.env.GDRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN?.trim();

  // Hanya gunakan OAuth2 jika credentials valid (bukan placeholder 'xxx' dan tidak kosong)
  const isValidOAuth = !!(clientId && clientSecret && refreshToken &&
    clientId.length > 10 && clientSecret.length > 5 && refreshToken.length > 5 &&
    !clientId.includes('xxx') && !clientSecret.includes('xxx') && !refreshToken.includes('xxx'));

  if (isValidOAuth) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback ke Service Account (serviceAccountKey.json)
  const keyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  
  if (!fs.existsSync(keyPath)) {
    throw new Error('File serviceAccountKey.json tidak ditemukan dan OAuth2 credentials belum di-set di .env.');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive'],
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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
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
      supportsAllDrives: true,
    });
    
    return folderRes.data.id as string;
  } catch (error) {
    console.error('❌ Gagal mencari/membuat folder di GDrive:', error);
    throw error;
  }
};

/**
 * Mengunggah file ke Google Drive (ke dalam folder tertentu).
 * Jika file dengan nama yang sama sudah ada di folder tersebut (misal backup di tanggal yang sama),
 * file akan diperbarui (update) dan duplikat lama akan dibersihkan agar tidak double di GDrive.
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

  const media = {
    mimeType: 'application/sql',
    body: fs.createReadStream(filePath),
  };

  try {
    // 1. Cek apakah file dengan nama yang sama sudah ada di folder tujuan (hindari file double di tanggal yang sama)
    const existingRes = await drive.files.list({
      q: `name = '${fileName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existingFiles = existingRes.data.files || [];

    if (existingFiles.length > 0) {
      const primaryFile = existingFiles[0];
      console.log(`ℹ️ File "${fileName}" sudah ada di GDrive (ID: ${primaryFile.id}). Memperbarui konten file...`);

      const response = await drive.files.update({
        fileId: primaryFile.id as string,
        media: media,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true,
      });

      // Jika ada lebih dari satu file dengan nama yang sama (duplikat dari backup sebelumnya), bersihkan sisanya
      if (existingFiles.length > 1) {
        for (let i = 1; i < existingFiles.length; i++) {
          await removeDuplicateFile(drive, existingFiles[i].id as string, folderId, fileName);
        }
      }

      return response.data;
    }

    // 2. Jika belum ada, buat file baru
    const fileMetadata = {
      name: fileName,
      parents: [folderId], // Upload ke dalam folder ini
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    // 3. Post-upload deduplication: Jika ternyata ada upload konkuren yang lolos, bersihkan duplikat
    try {
      await cleanFolderDuplicates(folderId);
    } catch (cleanErr) {
      console.warn('⚠️ Post-upload deduplication warning:', cleanErr);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Gagal mengunggah ke Google Drive:', error);
    throw error;
  }
};

/**
 * Helper untuk menghapus atau mencabut parent (unlink) file duplikat di GDrive
 * dengan fallback delete -> trash -> removeParents.
 */
const removeDuplicateFile = async (drive: any, fileId: string, folderId: string, fileName?: string): Promise<boolean> => {
  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
    console.log(`🧹 Berhasil menghapus duplikat GDrive: ${fileName || fileId} (ID: ${fileId})`);
    return true;
  } catch (delErr: any) {
    try {
      await drive.files.update({
        fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true,
      });
      console.log(`🗑️ Berhasil memindahkan ke sampah: ${fileName || fileId} (ID: ${fileId})`);
      return true;
    } catch (trashErr: any) {
      try {
        await drive.files.update({
          fileId,
          removeParents: folderId,
          supportsAllDrives: true,
        });
        console.log(`✂️ Berhasil melepaskan duplikat dari folder: ${fileName || fileId} (ID: ${fileId})`);
        return true;
      } catch (unlinkErr: any) {
        console.warn(`⚠️ Gagal membersihkan duplikat ${fileId}:`, unlinkErr?.message);
        return false;
      }
    }
  }
};

/**
 * Membersihkan semua file duplikat di sebuah folder Google Drive.
 * Jika ditemukan beberapa file dengan nama yang sama persis,
 * file dengan ukuran terbesar / terbaru akan dipertahankan, dan duplikat lainnya dihapus.
 */
export const cleanFolderDuplicates = async (folderId: string): Promise<number> => {
  const drive = getDriveService();
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, createdTime)',
      pageSize: 1000,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    // Kelompokkan berdasarkan nama
    const fileGroups: Record<string, any[]> = {};
    for (const f of files) {
      if (!f.name) continue;
      if (!fileGroups[f.name]) {
        fileGroups[f.name] = [];
      }
      fileGroups[f.name].push(f);
    }

    let deletedCount = 0;
    for (const fileName in fileGroups) {
      const group = fileGroups[fileName];
      if (group.length > 1) {
        // Urutkan: ukuran terbesar di depan, jika ukuran sama maka waktu pembuatan terbaru di depan
        group.sort((a, b) => {
          const sizeA = parseInt(a.size || '0', 10);
          const sizeB = parseInt(b.size || '0', 10);
          if (sizeB !== sizeA) return sizeB - sizeA;
          const timeA = new Date(a.createdTime || 0).getTime();
          const timeB = new Date(b.createdTime || 0).getTime();
          return timeB - timeA;
        });

        // Simpan index 0 (terbaik/terbesar), hapus index 1 dst.
        for (let i = 1; i < group.length; i++) {
          const dup = group[i];
          const ok = await removeDuplicateFile(drive, dup.id, folderId, fileName);
          if (ok) deletedCount++;
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ Gagal membersihkan duplikat folder di GDrive:', error);
    return 0;
  }
};


