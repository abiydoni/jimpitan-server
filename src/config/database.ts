import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { addStartupLog } from '../utils/startupLogs';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL belum di-set di file .env');
}

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'mysql',
  logging: false, // Ubah ke console.log untuk melihat log query SQL di terminal
  timezone: '+07:00', // Zona waktu Indonesia (WIB = UTC+7)
});

export const connectDB = async () => {
  let isConnected = false;
  
  while (!isConnected) {
    try {
      await sequelize.authenticate();
      addStartupLog('✅ Koneksi ke MySQL berhasil.');

      // Sinkronisasi model ke database (otomatis membuat tabel jika belum ada)
      // Gunakan { alter: false } agar tidak terjadi error bentrok Foreign Key saat booting
      await sequelize.sync({ alter: false });
      addStartupLog('✅ Semua model berhasil disinkronisasi ke database.');
      
      isConnected = true; // Berhenti dari loop jika sukses
    } catch (error) {
      addStartupLog('❌ Gagal koneksi ke MySQL: ' + (error as Error).message);
      addStartupLog('⏳ Mencoba menyambungkan kembali dalam 5 detik...');
      
      // Tunggu 5 detik sebelum mencoba lagi
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
