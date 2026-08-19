import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateDatabaseBackup } from '../utils/dbBackup';

import { uploadFileToDrive, getOrCreateFolder } from '../services/gdriveService';

// 1. BACKUP DATABASE (DARI TOMBOL WEB DOWNLOAD)
export const backupDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = await generateDatabaseBackup();
    const fileName = path.basename(filePath);
    
    // Download file ke client
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Hapus file lokal setelah di-download
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1b. TRIGGER BACKUP DATABASE LANGSUNG KE GOOGLE DRIVE
export const triggerGDriveBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const gdriveFolderId = process.env.GDRIVE_FOLDER_ID;
    if (!gdriveFolderId || gdriveFolderId === 'xxxxxx') {
      res.status(400).json({ success: false, message: 'GDRIVE_FOLDER_ID belum dikonfigurasi di environment (.env).' });
      return;
    }

    const currentMonthYear = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }).replace(/ /g, '-');
    const targetFolderId = await getOrCreateFolder(currentMonthYear, gdriveFolderId);

    const currentDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
    const customFileName = `jimpitan-${currentDate}.sql`;

    const sqlFilePath = await generateDatabaseBackup();
    const uploadResult = await uploadFileToDrive(sqlFilePath, targetFolderId, customFileName);

    if (fs.existsSync(sqlFilePath)) {
      fs.unlinkSync(sqlFilePath);
    }

    res.json({
      success: true,
      message: 'Backup database berhasil diunggah ke Google Drive!',
      data: uploadResult
    });
  } catch (error: any) {
    console.error('❌ Gagal backup manual ke Google Drive:', error);
    res.status(500).json({ success: false, message: error?.message || 'Gagal backup ke Google Drive' });
  }
};

// 2. CLEAR SYSTEM LOGS / CACHE
export const clearSystemCache = async (req: Request, res: Response): Promise<void> => {
  try {
    // Sebagai contoh: Membersihkan folder uploads/temp jika ada
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    let deletedCount = 0;

    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Cache dan log sistem berhasil dibersihkan. (${deletedCount} file dihapus)` 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
