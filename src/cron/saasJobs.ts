import cron from 'node-cron';
import { Op } from 'sequelize';
import { VillageSubscription, SubscriptionPlan, Invoice, User, Village, SystemSetting, sequelize } from '../models';
import { addStartupLog } from '../utils/startupLogs';
import { addJakartaDays } from '../utils/jakartaTime';
import { generateDatabaseBackup } from '../utils/dbBackup';
import { uploadFileToDrive, getOrCreateFolder, cleanFolderDuplicates } from '../services/gdriveService';
import fs from 'fs';

// Helper: Minta lock terdistribusi via MySQL (mencegah eksekusi paralel antar worker Passenger / Cluster)
async function acquireDistributedLock(lockName: string): Promise<boolean> {
  try {
    const [results]: any = await sequelize.query(`SELECT GET_LOCK('${lockName}', 0) as acquired;`);
    return results && results[0] && results[0].acquired === 1;
  } catch (e) {
    console.warn(`⚠️ Gagal meminta lock ${lockName}:`, e);
    return false;
  }
}

// Helper: Lepas lock terdistribusi via MySQL
async function releaseDistributedLock(lockName: string): Promise<void> {
  try {
    await sequelize.query(`SELECT RELEASE_LOCK('${lockName}');`);
  } catch (e) {
    console.warn(`⚠️ Gagal melepaskan lock ${lockName}:`, e);
  }
}

// Flag lokal di memori proses
let isBackupRunning = false;

// Fungsi untuk menjadwalkan semua tugas latar belakang SaaS
export const initSaasCronJobs = () => {
  addStartupLog('✅ Cron Jobs SaaS diinisialisasi (Berjalan setiap jam 00:00 & 02:00 WIB)');

  // Jadwal: Setiap hari jam 00:00 WIB
  cron.schedule('0 0 * * *', async () => {
    const hasLock = await acquireDistributedLock('saas_daily_cron_lock');
    if (!hasLock) {
      console.log('⚠️ [Cron 00:00] Dilewati: Worker server lain sedang menjalankan tugas harian.');
      return;
    }

    try {
      const todayDate = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');
      const lastRun = await SystemSetting.findOne({ where: { key: 'LAST_SAAS_DAILY_CRON_DATE' } });
      if (lastRun && (lastRun as any).value === todayDate) {
        console.log(`ℹ️ [Cron 00:00] Tugas harian SaaS untuk tanggal ${todayDate} sudah pernah dijalankan.`);
        return;
      }

      console.log('⏳ Memulai eksekusi Cron Jobs harian SaaS (00:00 WIB)...');
      await generateInvoices();
      await executeAutoSuspend();

      await SystemSetting.upsert({
        key: 'LAST_SAAS_DAILY_CRON_DATE',
        value: todayDate,
      });
    } catch (error) {
      console.error('❌ Gagal mengeksekusi Cron Jobs SaaS:', error);
    } finally {
      await releaseDistributedLock('saas_daily_cron_lock');
    }
  }, {
    timezone: 'Asia/Jakarta'
  });

  // Jadwal: Setiap hari jam 02:00 pagi WIB untuk Auto-Backup Google Drive
  cron.schedule('0 2 * * *', async () => {
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
      const lastBackup = await SystemSetting.findOne({ where: { key: 'LAST_GDRIVE_AUTO_BACKUP_DATE' } });
      if (lastBackup && (lastBackup as any).value === currentDate) {
        console.log(`ℹ️ [Auto-Backup] Backup Google Drive untuk hari ini (${currentDate}) sudah selesai sebelumnya. Melewati.`);
        return;
      }

      console.log(`⏳ Memulai eksekusi Auto-Backup Google Drive (${customFileName}) (Jam 02:00 WIB)...`);

      // Buat format bulan-tahun (misal: "Oktober-2026") waktu Asia/Jakarta (WIB)
      const currentMonthYear = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');
      
      // Dapatkan atau buat sub-folder untuk bulan ini
      const targetFolderId = await getOrCreateFolder(currentMonthYear, gdriveFolderId);

      // 3. Buat file .sql secara lokal (dengan nama file unik per proses)
      const sqlFilePath = await generateDatabaseBackup();
      console.log(`✅ File backup lokal berhasil dibuat: ${sqlFilePath}`);

      try {
        // 4. Upload ke Google Drive dengan nama custom dan ke folder bulan ini
        const uploadResult = await uploadFileToDrive(sqlFilePath, targetFolderId, customFileName);
        console.log(`✅ Berhasil diunggah ke GDrive: ${uploadResult.name} (Link: ${uploadResult.webViewLink})`);

        // 5. Bersihkan duplikat jika ada di folder bulan ini
        const cleaned = await cleanFolderDuplicates(targetFolderId);
        if (cleaned > 0) {
          console.log(`🧹 ${cleaned} file duplikat lama di GDrive berhasil dibersihkan.`);
        }

        // 6. Catat tanggal sukses backup hari ini agar tidak pernah berjalan ganda
        await SystemSetting.upsert({
          key: 'LAST_GDRIVE_AUTO_BACKUP_DATE',
          value: currentDate,
        });
      } finally {
        // Hapus file lokal setelah di-upload untuk hemat disk
        if (fs.existsSync(sqlFilePath)) {
          fs.unlinkSync(sqlFilePath);
          console.log(`🧹 File backup lokal dibersihkan: ${sqlFilePath}`);
        }
      }
    } catch (error) {
      console.error('❌ Gagal melakukan Auto-Backup Google Drive:', error);
    } finally {
      isBackupRunning = false;
      await releaseDistributedLock('saas_gdrive_backup_lock');
    }
  }, {
    timezone: 'Asia/Jakarta'
  });
};

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
  const subscriptions = await VillageSubscription.findAll({
    where: {
      status: 'ACTIVE',
      autoRenew: true,
      endDate: {
        [Op.between]: [targetDate, targetDateEnd]
      }
    },
    include: [{ model: SubscriptionPlan, as: 'plan' }]
  });

  for (const sub of subscriptions) {
    const villageId = sub.getDataValue('villageId');
    const plan = sub.getDataValue('plan');
    
    if (!plan) continue;

    // Hitung jumlah KK di desa ini (Berdasarkan unique familyId)
    // Untuk warga yang tidak punya familyId, kita biarkan saja / tidak dihitung, atau kita bisa tambahkan logika fallback.
    const kkCount = await User.count({
      where: { villageId, familyId: { [Op.ne]: null } },
      col: 'familyId',
      distinct: true
    });

    const baseAmount = Number(plan.basePrice);
    const kkAmount = Number(plan.pricePerKk) * kkCount;
    const totalAmount = baseAmount + kkAmount;
    
    const dueDate = new Date(sub.getDataValue('endDate'));

    // Cek apakah invoice untuk siklus ini sudah dibuat agar tidak double
    const existingInvoice = await Invoice.findOne({
      where: { villageId, dueDate: { [Op.between]: [targetDate, targetDateEnd] } }
    });

    if (!existingInvoice) {
      await Invoice.create({
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
  const gracePeriodEnd = addJakartaDays(new Date(), -3);

  // Cari invoice UNPAID yang sudah melebihi masa tenggang (dueDate < H-3)
  const expiredInvoices = await Invoice.findAll({
    where: {
      status: 'UNPAID',
      dueDate: { [Op.lte]: gracePeriodEnd }
    }
  });

  for (const invoice of expiredInvoices) {
    const villageId = invoice.getDataValue('villageId');
    
    // Ubah status langganan desa menjadi SUSPENDED
    await VillageSubscription.update(
      { status: 'SUSPENDED' },
      { where: { villageId, status: { [Op.ne]: 'SUSPENDED' } } }
    );
    
    // Ubah status invoice menjadi EXPIRED (atau biarkan UNPAID tapi desa tersuspend)
    await invoice.update({ status: 'EXPIRED' });
    
    console.log(`🚫 [CRON] Village ${villageId} SUSPENDED karena menunggak lebih dari 3 hari.`);
  }
};
