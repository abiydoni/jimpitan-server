process.env.TZ = 'Asia/Jakarta'; // Paksa zona waktu server ke WIB (UTC+7)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { sendSyncNotification } from './services/firebaseService';
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import duesRoutes from './routes/duesRoutes';
import jadwalRoutes from './routes/jadwalRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import chatRoutes from './routes/chatRoutes';
import masterRoutes from './routes/masterRoutes';
import roleRoutes from './routes/roleRoutes';
import superadminRoutes from './routes/superadminRoutes';
import saasRoutes from './routes/saasRoutes';
import monitorRoutes from './routes/monitorRoutes';
import path from 'path';
import { initSaasCronJobs } from './cron/saasJobs';
import { addStartupLog } from './utils/startupLogs';
import { User, Role } from './models';

// Inisialisasi model-model agar di-load oleh Sequelize
import './models';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Supaya bisa baca request.body JSON ukuran besar (base64)
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Tampilan web statis sudah dipindah ke jimpitan-server

// Endpoint untuk melayani Halaman Server Control Panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/views/monitor.html'));
});

// ==========================================
// REQUEST LOGGER
// ==========================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// DAFTAR ROUTES (ENDPOINTS)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/server', monitorRoutes);

// Endpoint sederhana untuk testing (Sekarang dilayani oleh public/index.html)
// app.get('/', (req, res) => {
//   res.send('API Jimpitan Backend berjalan normal.');
// });

// Endpoint sementara untuk menguji FCM Sync
app.get('/test-fcm/:villageId', async (req, res) => {
  const { villageId } = req.params;
  try {
    await sendSyncNotification(villageId, 'TEST_SYNC');
    res.json({ success: true, message: `Pesan FCM berhasil dikirim ke villageId: ${villageId}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, async () => {
  addStartupLog(`🚀 Server berjalan di http://localhost:${port}`);
  
  // Connect ke database MySQL saat server dinyalakan
  await connectDB();

  // Pastikan data SUPER_ADMIN selalu sinkron antara tabel users dan roles
  await ensureSuperAdmin();
  
  // Jalankan Cron Jobs untuk SaaS
  initSaasCronJobs();
});


/**
 * Memastikan data Super Admin resmi (appsbeem@gmail.com) ada dan sinkron
 * di tabel users dan roles. Dipanggil setiap kali server start.
 */
async function ensureSuperAdmin() {
  const SUPER_ADMIN_EMAIL = 'appsbeem@gmail.com';

  try {
    // 1. Cari user Super Admin berdasarkan email resmi
    const superadmin = await User.findOne({ where: { email: SUPER_ADMIN_EMAIL } });

    if (!superadmin) {
      // Belum login sama sekali — user akan otomatis terdaftar saat pertama login via Firebase Auth
      addStartupLog(`⚠️ Super Admin (${SUPER_ADMIN_EMAIL}) belum ada di tabel users. Akan dibuat saat login pertama.`);
      return;
    }

    const adminUid = superadmin.getDataValue('uid');
    addStartupLog(`✅ Super Admin ditemukan: uid=${adminUid}, email=${SUPER_ADMIN_EMAIL}`);

    // 2. Pastikan status ACTIVE
    if (superadmin.getDataValue('status') !== 'ACTIVE') {
      await superadmin.update({ status: 'ACTIVE' });
      addStartupLog(`🔄 Status Super Admin diperbarui ke ACTIVE`);
    }

    // 3. Pastikan role SUPER_ADMIN ada untuk uid ini
    const [, roleCreated] = await Role.findOrCreate({
      where: { userId: adminUid, name: 'SUPER_ADMIN' },
      defaults: {
        id: `role_superadmin_${adminUid}`,
        name: 'SUPER_ADMIN',
        userId: adminUid,
        villageId: null,
      }
    });

    if (roleCreated) {
      addStartupLog(`✅ Role SUPER_ADMIN dibuat untuk uid=${adminUid}`);
    } else {
      addStartupLog(`✅ Role SUPER_ADMIN sudah ada untuk uid=${adminUid}`);
    }

    // 4. Bersihkan entri dummy lama jika masih ada
    const dummyDeleted = await User.destroy({ where: { uid: 'SUPER_ADMIN' } });
    if (dummyDeleted > 0) {
      addStartupLog(`🧹 Entri dummy uid='SUPER_ADMIN' dihapus dari tabel users`);
      await Role.destroy({ where: { userId: 'SUPER_ADMIN' } });
      addStartupLog(`🧹 Role dummy uid='SUPER_ADMIN' dihapus dari tabel roles`);
    }

  } catch (error: any) {
    addStartupLog(`⚠️ Gagal sinkronisasi Super Admin: ${error.message}`);
    console.error('ensureSuperAdmin error:', error);
  }
}
