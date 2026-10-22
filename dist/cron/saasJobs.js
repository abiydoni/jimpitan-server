"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSaasCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const startupLogs_1 = require("../utils/startupLogs");
const jakartaTime_1 = require("../utils/jakartaTime");
const dbBackup_1 = require("../utils/dbBackup");
const gdriveService_1 = require("../services/gdriveService");
const fs_1 = __importDefault(require("fs"));
// Helper: Minta lock terdistribusi via MySQL (mencegah eksekusi paralel antar worker Passenger / Cluster)
async function acquireDistributedLock(lockName) {
    try {
        const [results] = await models_1.sequelize.query(`SELECT GET_LOCK('${lockName}', 0) as acquired;`);
        return results && results[0] && results[0].acquired === 1;
    }
    catch (e) {
        console.warn(`⚠️ Gagal meminta lock ${lockName}:`, e);
        return false;
    }
}
// Helper: Lepas lock terdistribusi via MySQL
async function releaseDistributedLock(lockName) {
    try {
        await models_1.sequelize.query(`SELECT RELEASE_LOCK('${lockName}');`);
    }
    catch (e) {
        console.warn(`⚠️ Gagal melepaskan lock ${lockName}:`, e);
    }
}
// Flag lokal di memori proses
let isBackupRunning = false;
// Fungsi untuk menjadwalkan semua tugas latar belakang SaaS
const initSaasCronJobs = () => {
    (0, startupLogs_1.addStartupLog)('✅ Cron Jobs SaaS diinisialisasi (Berjalan setiap jam 00:00 & 02:00 WIB)');
    // Jadwal: Setiap hari jam 00:00 WIB
    node_cron_1.default.schedule('0 0 * * *', async () => {
        const hasLock = await acquireDistributedLock('saas_daily_cron_lock');
        if (!hasLock) {
            console.log('⚠️ [Cron 00:00] Dilewati: Worker server lain sedang menjalankan tugas harian.');
            return;
        }
        try {
            const todayDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');
            const lastRun = await models_1.SystemSetting.findOne({ where: { key: 'LAST_SAAS_DAILY_CRON_DATE' } });
            if (lastRun && lastRun.value === todayDate) {
                console.log(`ℹ️ [Cron 00:00] Tugas harian SaaS untuk tanggal ${todayDate} sudah pernah dijalankan.`);
                return;
            }
            console.log('⏳ Memulai eksekusi Cron Jobs harian SaaS (00:00 WIB)...');
            await generateInvoices();
            await executeAutoSuspend();
            await models_1.SystemSetting.upsert({
                key: 'LAST_SAAS_DAILY_CRON_DATE',
                value: todayDate,
            });
        }
        catch (error) {
            console.error('❌ Gagal mengeksekusi Cron Jobs SaaS:', error);
        }
        finally {
            await releaseDistributedLock('saas_daily_cron_lock');
        }
    }, {
        timezone: 'Asia/Jakarta'
    });
    // Jadwal: Setiap hari jam 02:00 pagi WIB untuk Auto-Backup Google Drive
    node_cron_1.default.schedule('0 2 * * *', async () => {
        if (isBackupRunning) {
            console.log('⚠️ Auto-Backup dilewati: proses backup di proses ini masih berjalan.');
            return;
        }
        // 1. Minta lock terdistribusi via MySQL (hanya 1 worker Passenger yang boleh jalan)
        const hasLock = await acquireDistributedLock('saas_gdrive_backup_lock');
        if (!hasLock) {
            console.log('⚠️ [Auto-Backup] Dilewati: Worker server lain sedang menjalankan backup.');
            return;
        }
        isBackupRunning = true;
        try {
            const gdriveFolderId = process.env.GDRIVE_FOLDER_ID;
            if (!gdriveFolderId || gdriveFolderId === 'xxxxxx') {
                console.warn('⚠️ Auto-Backup dilewati: GDRIVE_FOLDER_ID belum dikonfigurasi di .env');
                return;
            }
            // Buat format tanggal (misal: "22-Oktober-2026") waktu Asia/Jakarta (WIB)
            const currentDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');
            const customFileName = `jimpitan-${currentDate}.sql`;
            // 2. Cek apakah backup untuk hari ini sudah pernah berhasil dilakukan (Database Persistent Guard)
            const lastBackup = await models_1.SystemSetting.findOne({ where: { key: 'LAST_GDRIVE_AUTO_BACKUP_DATE' } });
            if (lastBackup && lastBackup.value === currentDate) {
                console.log(`ℹ️ [Auto-Backup] Backup Google Drive untuk hari ini (${currentDate}) sudah selesai sebelumnya. Melewati.`);
                return;
            }
            console.log(`⏳ Memulai eksekusi Auto-Backup Google Drive (${customFileName}) (Jam 02:00 WIB)...`);
            // Buat format bulan-tahun (misal: "Oktober-2026") waktu Asia/Jakarta (WIB)
            const currentMonthYear = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');
            // Dapatkan atau buat sub-folder untuk bulan ini
            const targetFolderId = await (0, gdriveService_1.getOrCreateFolder)(currentMonthYear, gdriveFolderId);
            // 3. Buat file .sql secara lokal (dengan nama file unik per proses)
            const sqlFilePath = await (0, dbBackup_1.generateDatabaseBackup)();
            console.log(`✅ File backup lokal berhasil dibuat: ${sqlFilePath}`);
            try {
                // 4. Upload ke Google Drive dengan nama custom dan ke folder bulan ini
                const uploadResult = await (0, gdriveService_1.uploadFileToDrive)(sqlFilePath, targetFolderId, customFileName);
                console.log(`✅ Berhasil diunggah ke GDrive: ${uploadResult.name} (Link: ${uploadResult.webViewLink})`);
                // 5. Bersihkan duplikat jika ada di folder bulan ini
                const cleaned = await (0, gdriveService_1.cleanFolderDuplicates)(targetFolderId);
                if (cleaned > 0) {
                    console.log(`🧹 ${cleaned} file duplikat lama di GDrive berhasil dibersihkan.`);
                }
                // 6. Catat tanggal sukses backup hari ini agar tidak pernah berjalan ganda
                await models_1.SystemSetting.upsert({
                    key: 'LAST_GDRIVE_AUTO_BACKUP_DATE',
                    value: currentDate,
                });
            }
            finally {
                // Hapus file lokal setelah di-upload untuk hemat disk
                if (fs_1.default.existsSync(sqlFilePath)) {
                    fs_1.default.unlinkSync(sqlFilePath);
                    console.log(`🧹 File backup lokal dibersihkan: ${sqlFilePath}`);
                }
            }
        }
        catch (error) {
            console.error('❌ Gagal melakukan Auto-Backup Google Drive:', error);
        }
        finally {
            isBackupRunning = false;
            await releaseDistributedLock('saas_gdrive_backup_lock');
        }
    }, {
        timezone: 'Asia/Jakarta'
    });
};
exports.initSaasCronJobs = initSaasCronJobs;
/**
 * 1. BILLING GENERATOR (H-7)
 * Mencari langganan desa yang akan habis 7 hari lagi, menghitung KK, dan mencetak tagihan.
 */
const generateInvoices = async () => {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 7);
    // Set jam ke 00:00:00 untuk perbandingan akurat
    targetDate.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);
    // Cari langganan yang aktif dan akan berakhir pada (H-7)
    const subscriptions = await models_1.VillageSubscription.findAll({
        where: {
            status: 'ACTIVE',
            autoRenew: true,
            endDate: {
                [sequelize_1.Op.between]: [targetDate, targetDateEnd]
            }
        },
        include: [{ model: models_1.SubscriptionPlan, as: 'plan' }]
    });
    for (const sub of subscriptions) {
        const villageId = sub.getDataValue('villageId');
        const plan = sub.getDataValue('plan');
        if (!plan)
            continue;
        // Hitung jumlah KK di desa ini (Berdasarkan unique familyId)
        // Untuk warga yang tidak punya familyId, kita biarkan saja / tidak dihitung, atau kita bisa tambahkan logika fallback.
        const kkCount = await models_1.User.count({
            where: { villageId, familyId: { [sequelize_1.Op.ne]: null } },
            col: 'familyId',
            distinct: true
        });
        const baseAmount = Number(plan.basePrice);
        const kkAmount = Number(plan.pricePerKk) * kkCount;
        const totalAmount = baseAmount + kkAmount;
        const dueDate = new Date(sub.getDataValue('endDate'));
        // Cek apakah invoice untuk siklus ini sudah dibuat agar tidak double
        const existingInvoice = await models_1.Invoice.findOne({
            where: { villageId, dueDate: { [sequelize_1.Op.between]: [targetDate, targetDateEnd] } }
        });
        if (!existingInvoice) {
            await models_1.Invoice.create({
                villageId,
                baseAmount,
                kkAmount,
                totalAmount,
                kkCount,
                status: 'UNPAID',
                dueDate
            });
            console.log(`✅ [CRON] Invoice dibuat untuk Village ${villageId}. Total: Rp ${totalAmount}`);
        }
    }
};
/**
 * 2. AUTO-SUSPEND (H+3)
 * Mencari invoice UNPAID yang jatuh temponya sudah lewat 3 hari lalu.
 * Jika ditemukan, ubah status village_subscriptions menjadi SUSPENDED.
 */
const executeAutoSuspend = async () => {
    const gracePeriodEnd = (0, jakartaTime_1.addJakartaDays)(new Date(), -3);
    // Cari invoice UNPAID yang sudah melebihi masa tenggang (dueDate < H-3)
    const expiredInvoices = await models_1.Invoice.findAll({
        where: {
            status: 'UNPAID',
            dueDate: { [sequelize_1.Op.lte]: gracePeriodEnd }
        }
    });
    for (const invoice of expiredInvoices) {
        const villageId = invoice.getDataValue('villageId');
        // Ubah status langganan desa menjadi SUSPENDED
        await models_1.VillageSubscription.update({ status: 'SUSPENDED' }, { where: { villageId, status: { [sequelize_1.Op.ne]: 'SUSPENDED' } } });
        // Ubah status invoice menjadi EXPIRED (atau biarkan UNPAID tapi desa tersuspend)
        await invoice.update({ status: 'EXPIRED' });
        console.log(`🚫 [CRON] Village ${villageId} SUSPENDED karena menunggak lebih dari 3 hari.`);
    }
};
