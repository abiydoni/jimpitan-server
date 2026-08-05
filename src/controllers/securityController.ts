import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateDatabaseBackup } from '../utils/dbBackup';

// 1. BACKUP DATABASE
// 1. BACKUP DATABASE (DARI TOMBOL WEB)
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
