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
  
  // Jalankan Cron Jobs untuk SaaS
  initSaasCronJobs();
});
