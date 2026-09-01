import { exec } from 'child_process';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { sequelize } from '../config/database';

/**
 * Membuat backup database MySQL menggunakan mysqldump.
 * Jika mysqldump tidak tersedia di server (misal cPanel nodeenv),
 * otomatis menggunakan fallback JS dumper via Sequelize.
 */
export const generateDatabaseBackup = (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
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

      exec(dumpCmd, async (error) => {
        if (!error && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          return resolve(filePath);
        }

        // Fallback: Jika mysqldump tidak terinstall / gagal di cPanel nodeenv
        console.warn('⚠️ mysqldump tidak tersedia atau gagal, menggunakan fallback JS Backup Dumper...');
        try {
          await generateJsDatabaseBackup(filePath);
          resolve(filePath);
        } catch (jsErr: any) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(new Error(`Gagal melakukan backup database: ${jsErr?.message || jsErr}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Fallback JS Dumper: Mengambil seluruh struktur & data tabel via Sequelize
 */
async function generateJsDatabaseBackup(filePath: string): Promise<void> {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  stream.write(`-- Dump Database Jimpitan Server\n`);
  stream.write(`-- Generated at: ${new Date().toISOString()}\n\n`);
  stream.write(`SET FOREIGN_KEY_CHECKS=0;\n\n`);

  const [tablesRaw]: any = await sequelize.query("SHOW TABLES;");
  const tableNames = tablesRaw.map((row: any) => Object.values(row)[0] as string);

  for (const tableName of tableNames) {
    const [createTableRaw]: any = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\`;`);
    if (createTableRaw && createTableRaw[0] && createTableRaw[0]['Create Table']) {
      stream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
      stream.write(`${createTableRaw[0]['Create Table']};\n\n`);
    }

    const [rows]: any = await sequelize.query(`SELECT * FROM \`${tableName}\`;`);
    if (Array.isArray(rows) && rows.length > 0) {
      const keys = Object.keys(rows[0]).map(k => `\`${k}\``).join(', ');
      for (const row of rows) {
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number' || typeof val === 'boolean') return val;
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
          return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
        }).join(', ');

        stream.write(`INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`);
      }
      stream.write(`\n`);
    }
  }

  stream.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
  await new Promise(res => stream.end(res));
}
