import { exec } from 'child_process';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

/**
 * Membuat backup database MySQL menggunakan mysqldump.
 * Mengembalikan path lokal ke file .sql yang dihasilkan.
 */
export const generateDatabaseBackup = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const dbUrlString = process.env.DATABASE_URL;
    if (!dbUrlString) {
      return reject(new Error('DATABASE_URL tidak ditemukan di environment.'));
    }

    try {
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
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return reject(new Error('Gagal melakukan backup. Pastikan mysqldump terinstall di server.'));
        }

        resolve(filePath);
      });
    } catch (error) {
      reject(error);
    }
  });
};
