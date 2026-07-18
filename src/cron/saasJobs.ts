import cron from 'node-cron';
import { Op } from 'sequelize';
import { VillageSubscription, SubscriptionPlan, Invoice, User, Village } from '../models';
import { addStartupLog } from '../utils/startupLogs';

// Fungsi untuk menjadwalkan semua tugas latar belakang SaaS
export const initSaasCronJobs = () => {
  addStartupLog('✅ Cron Jobs SaaS diinisialisasi (Berjalan setiap jam 00:00)');

  // Jadwal: Setiap hari jam 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ Memulai eksekusi Cron Jobs harian SaaS...');
    
    try {
      await generateInvoices();
      await executeAutoSuspend();
      // await sendReminders(); // (Opsional: Kirim FCM ke user)
    } catch (error) {
      console.error('❌ Gagal mengeksekusi Cron Jobs SaaS:', error);
    }
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
  const today = new Date();
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(today.getDate() - 3);
  gracePeriodEnd.setHours(23, 59, 59, 999);

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
