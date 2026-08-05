import { Request, Response } from 'express';
import { exec } from 'child_process';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// 1. BACKUP DATABASE
export const backupDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbUrlString = process.env.DATABASE_URL;
    if (!dbUrlString) {
      res.status(500).json({ success: false, message: 'DATABASE_URL tidak ditemukan di environment.' });
      return;
    }

    const dbUrl = new URL(dbUrlString);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '3306';
    const user = dbUrl.username;
    const pass = dbUrl.password;
    const dbName = dbUrl.pathname.replace('/', '');

    // Direktori sementara untuk menyimpan file SQL
    const backupDir = path.join(process.cwd(), 'uploads', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const fileName = `backup-jimpitan-${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);

    // Command mysqldump
    const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} -p"${pass}" ${dbName} > "${filePath}"`;

    exec(dumpCmd, (error, stdout, stderr) => {
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
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
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
