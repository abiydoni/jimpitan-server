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
// Mengambil URL dari .env
const dbUrl = process.env.DATABASE_URL || "mysql://appsbeem_admin:A7by777__@localhost:3306/appsbeem_jimpitan_admin";
exports.sequelize = new sequelize_1.Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false, // Ubah ke console.log untuk melihat log query SQL di terminal
});
const connectDB = async () => {
    let isConnected = false;
    while (!isConnected) {
        try {
            await exports.sequelize.authenticate();
            (0, startupLogs_1.addStartupLog)('✅ Koneksi ke MySQL berhasil.');
            // Sinkronisasi model ke database (otomatis membuat tabel jika belum ada)
            // Gunakan { alter: false } agar tidak terjadi error bentrok Foreign Key saat booting
            await exports.sequelize.sync({ alter: false });
            (0, startupLogs_1.addStartupLog)('✅ Semua model berhasil disinkronisasi ke database.');
            isConnected = true; // Berhenti dari loop jika sukses
        }
        catch (error) {
            (0, startupLogs_1.addStartupLog)('❌ Gagal koneksi ke MySQL: ' + error.message);
            (0, startupLogs_1.addStartupLog)('⏳ Mencoba menyambungkan kembali dalam 5 detik...');
            // Tunggu 5 detik sebelum mencoba lagi
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};
exports.connectDB = connectDB;
