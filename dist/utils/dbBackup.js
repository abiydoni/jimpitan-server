"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDatabaseBackup = void 0;
const child_process_1 = require("child_process");
const url_1 = require("url");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Membuat backup database MySQL menggunakan mysqldump.
 * Mengembalikan path lokal ke file .sql yang dihasilkan.
 */
const generateDatabaseBackup = () => {
    return new Promise((resolve, reject) => {
        const dbUrlString = process.env.DATABASE_URL;
        if (!dbUrlString) {
            return reject(new Error('DATABASE_URL tidak ditemukan di environment.'));
        }
        try {
            const dbUrl = new url_1.URL(dbUrlString);
            const host = dbUrl.hostname;
            const port = dbUrl.port || '3306';
            const user = dbUrl.username;
            const pass = dbUrl.password;
            const dbName = dbUrl.pathname.replace('/', '');
            // Direktori sementara untuk menyimpan file SQL
            const backupDir = path_1.default.join(process.cwd(), 'uploads', 'backups');
            if (!fs_1.default.existsSync(backupDir)) {
                fs_1.default.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
            const fileName = `backup-jimpitan-${timestamp}.sql`;
            const filePath = path_1.default.join(backupDir, fileName);
            // Command mysqldump
            const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} -p"${pass}" ${dbName} > "${filePath}"`;
            (0, child_process_1.exec)(dumpCmd, (error, stdout, stderr) => {
                if (error) {
                    console.error('Backup Error:', error);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                    return reject(new Error('Gagal melakukan backup. Pastikan mysqldump terinstall di server.'));
                }
                resolve(filePath);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.generateDatabaseBackup = generateDatabaseBackup;
