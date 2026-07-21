"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = 'Asia/Jakarta'; // Paksa zona waktu server ke WIB (UTC+7)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const firebaseService_1 = require("./services/firebaseService");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const duesRoutes_1 = __importDefault(require("./routes/duesRoutes"));
const jadwalRoutes_1 = __importDefault(require("./routes/jadwalRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const masterRoutes_1 = __importDefault(require("./routes/masterRoutes"));
const roleRoutes_1 = __importDefault(require("./routes/roleRoutes"));
const superadminRoutes_1 = __importDefault(require("./routes/superadminRoutes"));
const saasRoutes_1 = __importDefault(require("./routes/saasRoutes"));
const monitorRoutes_1 = __importDefault(require("./routes/monitorRoutes"));
const path_1 = __importDefault(require("path"));
const saasJobs_1 = require("./cron/saasJobs");
const startupLogs_1 = require("./utils/startupLogs");
const models_1 = require("./models");
// Inisialisasi model-model agar di-load oleh Sequelize
require("./models");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // Supaya bisa baca request.body JSON ukuran besar (base64)
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Tampilan web statis sudah dipindah ke jimpitan-server
// Endpoint untuk melayani Halaman Server Control Panel
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../src/views/monitor.html'));
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/dues', duesRoutes_1.default);
app.use('/api/jadwal', jadwalRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/master', masterRoutes_1.default);
app.use('/api/roles', roleRoutes_1.default);
app.use('/api/superadmin', superadminRoutes_1.default);
app.use('/api/saas', saasRoutes_1.default);
app.use('/api/server', monitorRoutes_1.default);
// Endpoint sederhana untuk testing (Sekarang dilayani oleh public/index.html)
// app.get('/', (req, res) => {
//   res.send('API Jimpitan Backend berjalan normal.');
// });
// Endpoint sementara untuk menguji FCM Sync
app.get('/test-fcm/:villageId', async (req, res) => {
    const { villageId } = req.params;
    try {
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'TEST_SYNC');
        res.json({ success: true, message: `Pesan FCM berhasil dikirim ke villageId: ${villageId}` });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.listen(port, async () => {
    (0, startupLogs_1.addStartupLog)(`🚀 Server berjalan di http://localhost:${port}`);
    // Connect ke database MySQL saat server dinyalakan
    await (0, database_1.connectDB)();
    // Pastikan data SUPER_ADMIN selalu sinkron antara tabel users dan roles
    await ensureSuperAdmin();
    // Jalankan Cron Jobs untuk SaaS
    (0, saasJobs_1.initSaasCronJobs)();
});
/**
 * Memastikan data SUPER_ADMIN ada dan sinkron di tabel users dan roles.
 * Dipanggil setiap kali server start untuk menjaga konsistensi data.
 */
async function ensureSuperAdmin() {
    try {
        // 1. Pastikan user SUPER_ADMIN ada di tabel users
        const [superadmin, userCreated] = await models_1.User.findOrCreate({
            where: { uid: 'SUPER_ADMIN' },
            defaults: {
                uid: 'SUPER_ADMIN',
                name: 'Appsbee Support',
                email: 'superadmin@appsbee.id',
                status: 'ACTIVE',
                isOnline: false,
            }
        });
        if (userCreated) {
            (0, startupLogs_1.addStartupLog)('✅ SUPER_ADMIN user dibuat di tabel users');
        }
        else {
            // Pastikan status ACTIVE dan nama benar (update jika berbeda)
            const needsUpdate = superadmin.getDataValue('status') !== 'ACTIVE' ||
                superadmin.getDataValue('name') !== 'Appsbee Support';
            if (needsUpdate) {
                await superadmin.update({ status: 'ACTIVE', name: 'Appsbee Support' });
                (0, startupLogs_1.addStartupLog)('🔄 SUPER_ADMIN user diperbarui di tabel users');
            }
            else {
                (0, startupLogs_1.addStartupLog)('✅ SUPER_ADMIN user sudah ada dan sinkron');
            }
        }
        // 2. Pastikan role SUPER_ADMIN ada di tabel roles
        const [, roleCreated] = await models_1.Role.findOrCreate({
            where: { id: 'role_super_admin' },
            defaults: {
                id: 'role_super_admin',
                name: 'SUPER_ADMIN',
                userId: 'SUPER_ADMIN',
                villageId: null,
            }
        });
        if (roleCreated) {
            (0, startupLogs_1.addStartupLog)('✅ SUPER_ADMIN role dibuat di tabel roles');
        }
        else {
            (0, startupLogs_1.addStartupLog)('✅ SUPER_ADMIN role sudah ada');
        }
    }
    catch (error) {
        (0, startupLogs_1.addStartupLog)(`⚠️ Gagal memastikan SUPER_ADMIN sinkron: ${error.message}`);
        console.error('ensureSuperAdmin error:', error);
    }
}
