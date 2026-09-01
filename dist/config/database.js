"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const startupLogs_1 = require("../utils/startupLogs");
dotenv_1.default.config();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error('DATABASE_URL belum di-set di file .env');
}
exports.sequelize = new sequelize_1.Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false, // Ubah ke console.log untuk melihat log query SQL di terminal
    timezone: '+07:00', // Zona waktu Indonesia (WIB = UTC+7)
});
const connectDB = async () => {
    let isConnected = false;
    while (!isConnected) {
        try {
            await exports.sequelize.authenticate();
            (0, startupLogs_1.addStartupLog)('✅ Koneksi ke MySQL berhasil.');
            // Sinkronisasi model ke database (otomatis membuat tabel jika belum ada)
            await exports.sequelize.sync();
            (0, startupLogs_1.addStartupLog)('✅ Semua model berhasil disinkronisasi ke database.');
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN paymentProof LONGTEXT NULL;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices MODIFY COLUMN status ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'EXPIRED') DEFAULT 'UNPAID';");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN taxAmount DECIMAL(10,2) DEFAULT 0;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN taxPercentage DECIMAL(5,2) DEFAULT 10;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN planName VARCHAR(255) NULL;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN durationMonths INT NULL DEFAULT 1;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("ALTER TABLE invoices ADD COLUMN durationUnit VARCHAR(50) NULL DEFAULT 'MONTHLY';");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("CREATE TABLE IF NOT EXISTS `system_settings` (`key` VARCHAR(100) NOT NULL PRIMARY KEY, `value` TEXT NULL, `description` VARCHAR(255) NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("CREATE TABLE IF NOT EXISTS `subscription_plans` (`id` INT AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `basePrice` DECIMAL(10,2) NOT NULL DEFAULT 0, `pricePerKk` DECIMAL(10,2) NOT NULL DEFAULT 0, `maxKk` INT NULL, `features` JSON NULL, `durationMonths` INT NOT NULL DEFAULT 1, `durationUnit` VARCHAR(50) NOT NULL DEFAULT 'MONTHLY', `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            }
            catch (e) { }
            try {
                await exports.sequelize.query("INSERT IGNORE INTO system_settings (`key`, `value`, `description`, `createdAt`, `updatedAt`) VALUES ('TAX_PERCENTAGE', '10', 'Persentase Pajak (PPN) Tagihan', NOW(), NOW());");
            }
            catch (e) { }
            try {
                const [plansCount] = await exports.sequelize.query("SELECT COUNT(*) as cnt FROM subscription_plans;");
                if (plansCount && plansCount[0] && (plansCount[0].cnt === 0 || plansCount[0].cnt === '0')) {
                    await exports.sequelize.query(`INSERT INTO subscription_plans (\`name\`, \`basePrice\`, \`pricePerKk\`, \`maxKk\`, \`features\`, \`durationMonths\`, \`durationUnit\`, \`createdAt\`, \`updatedAt\`) VALUES 
            ('Paket 1 Bulan (Flat)', 50000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 1, 'MONTHLY', NOW(), NOW()),
            ('Paket 3 Bulan (Hemat)', 140000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 3, 'MONTHS', NOW(), NOW()),
            ('Paket 6 Bulan (Spesial)', 270000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 6, 'MONTHS', NOW(), NOW()),
            ('Paket 1 Tahun (Terbaik)', 500000, 0, null, '["Akses Semua Fitur", "Manajemen KK & Warga", "Laporan Keuangan", "Dukungan Prioritas"]', 1, 'YEARLY', NOW(), NOW());`);
                    (0, startupLogs_1.addStartupLog)('✅ Berhasil membuat 4 data paket langganan default.');
                }
            }
            catch (e) { }
            isConnected = true; // Berhenti dari loop jika sukses
        }
        catch (error) {
            console.error('❌ DB ERROR DETAIL:', error);
            (0, startupLogs_1.addStartupLog)('❌ Gagal koneksi ke MySQL: ' + (error?.message || error?.parent?.message || JSON.stringify(error)));
            (0, startupLogs_1.addStartupLog)('⏳ Mencoba menyambungkan kembali dalam 5 detik...');
            // Tunggu 5 detik sebelum mencoba lagi
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};
exports.connectDB = connectDB;
