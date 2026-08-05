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
// Fungsi untuk menjadwalkan semua tugas latar belakang SaaS
const initSaasCronJobs = () => {
    (0, startupLogs_1.addStartupLog)('✅ Cron Jobs SaaS diinisialisasi (Berjalan setiap jam 00:00)');
    // Jadwal: Setiap hari jam 00:00
    node_cron_1.default.schedule('0 0 * * *', async () => {
        console.log('⏳ Memulai eksekusi Cron Jobs harian SaaS...');
        try {
            await generateInvoices();
            await executeAutoSuspend();
            // await sendReminders(); // (Opsional: Kirim FCM ke user)
        }
        catch (error) {
            console.error('❌ Gagal mengeksekusi Cron Jobs SaaS:', error);
        }
    });
    // Jadwal: Setiap hari jam 02:00 pagi WIB untuk Auto-Backup Google Drive
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('⏳ Memulai eksekusi Auto-Backup Google Drive (Jam 02:00)...');
        try {
            const gdriveFolderId = process.env.GDRIVE_FOLDER_ID;
            if (!gdriveFolderId || gdriveFolderId === 'xxxxxx') {
                console.warn('⚠️ Auto-Backup dilewati: GDRIVE_FOLDER_ID belum dikonfigurasi di .env');
                return;
            }
            // Buat format bulan-tahun (misal: "Agustus-2026")
            const currentMonthYear = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }).replace(/ /g, '-');
            // Dapatkan atau buat sub-folder untuk bulan ini
            const targetFolderId = await (0, gdriveService_1.getOrCreateFolder)(currentMonthYear, gdriveFolderId);
            // Buat format tanggal (misal: "05-Agustus-2026")
            const currentDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-');
            const customFileName = `jimpitan-${currentDate}.sql`;
            // 1. Buat file .sql secara lokal
            const sqlFilePath = await (0, dbBackup_1.generateDatabaseBackup)();
            console.log(`✅ File backup lokal berhasil dibuat: ${sqlFilePath}`);
            // 2. Upload ke Google Drive dengan nama custom dan ke folder bulan ini
            const uploadResult = await (0, gdriveService_1.uploadFileToDrive)(sqlFilePath, targetFolderId, customFileName);
            console.log(`✅ Berhasil diunggah ke GDrive: ${uploadResult.name} (Link: ${uploadResult.webViewLink})`);
            // 3. Hapus file lokal setelah berhasil di-upload untuk hemat disk
            if (fs_1.default.existsSync(sqlFilePath)) {
                fs_1.default.unlinkSync(sqlFilePath);
            }
        }
        catch (error) {
            console.error('❌ Gagal melakukan Auto-Backup Google Drive:', error);
        }
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
