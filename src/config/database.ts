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
      await sequelize.sync();
      addStartupLog('✅ Semua model berhasil disinkronisasi ke database.');
      
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN paymentProof LONGTEXT NULL;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices MODIFY COLUMN status ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'EXPIRED') DEFAULT 'UNPAID';"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN taxAmount DECIMAL(10,2) DEFAULT 0;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN taxPercentage DECIMAL(5,2) DEFAULT 10;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN planName VARCHAR(255) NULL;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN durationMonths INT NULL DEFAULT 1;"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE invoices ADD COLUMN durationUnit VARCHAR(50) NULL DEFAULT 'MONTHLY';"); } catch (e) {}
      try { await sequelize.query("CREATE TABLE IF NOT EXISTS `system_settings` (`key` VARCHAR(100) NOT NULL PRIMARY KEY, `value` TEXT NULL, `description` VARCHAR(255) NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"); } catch (e) {}
      try { await sequelize.query("CREATE TABLE IF NOT EXISTS `subscription_plans` (`id` INT AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `basePrice` DECIMAL(10,2) NOT NULL DEFAULT 0, `pricePerKk` DECIMAL(10,2) NOT NULL DEFAULT 0, `maxKk` INT NULL, `features` JSON NULL, `durationMonths` INT NOT NULL DEFAULT 1, `durationUnit` VARCHAR(50) NOT NULL DEFAULT 'MONTHLY', `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"); } catch (e) {}
      try { await sequelize.query("CREATE TABLE IF NOT EXISTS `wa_blast_history` (`id` VARCHAR(128) NOT NULL PRIMARY KEY, `villageId` VARCHAR(128) NULL, `title` VARCHAR(255) NOT NULL, `message` TEXT NOT NULL, `targetFilter` VARCHAR(100) DEFAULT 'ALL_KK', `totalTarget` INT DEFAULT 0, `successCount` INT DEFAULT 0, `failedCount` INT DEFAULT 0, `details` JSON NULL, `sentBy` VARCHAR(255) NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"); } catch (e) {}
      try { await sequelize.query("INSERT INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('WA_GATEWAY_PROVIDER', 'appsbee', 'Provider WhatsApp Gateway (appsbee, fonnte, wablas, starsender, whacenter, generic)', NOW(), NOW()) ON DUPLICATE KEY UPDATE `value` = IF(`value` IS NULL OR `value` = '' OR `value` = 'fonnte', 'appsbee', `value`);"); } catch (e) {}
      try { await sequelize.query("INSERT INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('WA_API_KEY', 'wa-69aa3dbf930020c93f34b83add6374e8', 'API Key / Token WhatsApp Gateway', NOW(), NOW()) ON DUPLICATE KEY UPDATE `value` = IF(`value` IS NULL OR `value` = '', 'wa-69aa3dbf930020c93f34b83add6374e8', `value`);"); } catch (e) {}
      try { await sequelize.query("INSERT INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('WA_API_URL', 'https://wa-ab.appsbee.my.id/api/send-message', 'Endpoint URL WhatsApp Gateway', NOW(), NOW()) ON DUPLICATE KEY UPDATE `value` = IF(`value` IS NULL OR `value` = '', 'https://wa-ab.appsbee.my.id/api/send-message', `value`);"); } catch (e) {}
      try { await sequelize.query("INSERT INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('WA_SENDER_NUMBER', 'appsbee', 'Session ID / Device ID WhatsApp Gateway', NOW(), NOW()) ON DUPLICATE KEY UPDATE `value` = IF(`value` IS NULL OR `value` = '', 'appsbee', `value`);"); } catch (e) {}
      try { await sequelize.query("INSERT IGNORE INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('WA_DEFAULT_DELAY_SEC', '2', 'Delay jeda antar kirim pesan WhatsApp (detik)', NOW(), NOW());"); } catch (e) {}
      try { await sequelize.query("INSERT IGNORE INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('TAX_PERCENTAGE', '10', 'Persentase Pajak (PPN) Tagihan', NOW(), NOW());"); } catch (e) {}
      try {
        const [plansCount]: any = await sequelize.query("SELECT COUNT(*) as cnt FROM subscription_plans;");
        if (plansCount && plansCount[0] && (plansCount[0].cnt === 0 || plansCount[0].cnt === '0')) {
          await sequelize.query(`INSERT INTO subscription_plans (\`name\`, \`basePrice\`, \`pricePerKk\`, \`maxKk\`, \`features\`, \`durationMonths\`, \`durationUnit\`, \`createdAt\`, \`updatedAt\`) VALUES 
            ('Paket 1 Bulan (Flat)', 50000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 1, 'MONTHLY', NOW(), NOW()),
            ('Paket 3 Bulan (Hemat)', 140000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 3, 'MONTHS', NOW(), NOW()),
            ('Paket 6 Bulan (Spesial)', 270000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 6, 'MONTHS', NOW(), NOW()),
            ('Paket 1 Tahun (Terbaik)', 500000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 1, 'YEARLY', NOW(), NOW());`);
          addStartupLog('✅ Berhasil membuat 4 data paket langganan default.');
        }
      } catch (e) {}

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
