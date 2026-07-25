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
      await sequelize.sync({ alter: true });
      addStartupLog('✅ Semua model berhasil disinkronisasi ke database.');
      
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN paymentProof LONGTEXT NULL;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices MODIFY COLUMN status ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'EXPIRED') DEFAULT 'UNPAID';"); } catch (e) {}

      isConnected = true; // Berhenti dari loop jika sukses
    } catch (error: any) {
      console.error('❌ DB ERROR DETAIL:', error);
      addStartupLog('❌ Gagal koneksi ke MySQL: ' + (error?.message || error?.parent?.message || JSON.stringify(error)));
      addStartupLog('⏳ Mencoba menyambungkan kembali dalam 5 detik...');
      
      // Tunggu 5 detik sebelum mencoba lagi
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
