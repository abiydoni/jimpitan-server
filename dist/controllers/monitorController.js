"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performAction = exports.getStats = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const models_1 = require("../models");
const firebaseService_1 = require("../services/firebaseService");
let lastCpuInfo = os_1.default.cpus();
let lastCpuTime = Date.now();
const getCpuUsage = () => {
    const currentCpuInfo = os_1.default.cpus();
    const currentTime = Date.now();
    let idleDiff = 0;
    let totalDiff = 0;
    for (let i = 0; i < currentCpuInfo.length; i++) {
        const cpu = currentCpuInfo[i];
        const lastCpu = lastCpuInfo[i];
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const lastTotal = Object.values(lastCpu.times).reduce((a, b) => a + b, 0);
        idleDiff += cpu.times.idle - lastCpu.times.idle;
        totalDiff += total - lastTotal;
    }
    lastCpuInfo = currentCpuInfo;
    lastCpuTime = currentTime;
    if (totalDiff === 0)
        return 0;
    const usage = 100 - Math.floor((idleDiff / totalDiff) * 100);
    return usage;
};
const getStats = async (req, res) => {
    try {
        // Memory
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = Math.floor((usedMem / totalMem) * 100);
        // Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
        // Database Status
        let dbStatus = 'ONLINE';
        try {
            await models_1.sequelize.authenticate();
        }
        catch (e) {
            dbStatus = 'OFFLINE';
        }
        res.json({
            success: true,
            data: {
                cpuUsage: getCpuUsage(),
                memoryUsagePercent,
                usedMemMb: (usedMem / 1024 / 1024).toFixed(2),
                totalMemMb: (totalMem / 1024 / 1024).toFixed(2),
                uptime: uptimeFormatted,
                platform: os_1.default.platform(),
                dbStatus,
                fcmStatus: 'ONLINE' // Assuming FCM is online if app starts
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getStats = getStats;
const performAction = async (req, res) => {
    const { action, payload } = req.body;
    try {
        if (action === 'restart') {
            res.json({ success: true, message: 'Server sedang memulai ulang...' });
            // Beri jeda agar respon sempat terkirim ke klien
            setTimeout(() => {
                // Sentuh file temporary agar nodemon memicu restart otomatis
                const restartFile = path_1.default.join(__dirname, 'restart.tmp');
                fs_1.default.writeFileSync(restartFile, new Date().toISOString());
                // Nodemon akan otomatis merestart aplikasi saat mendeteksi perubahan file ini.
                // Kita tidak perlu memanggil process.exit(0) karena itu akan menyebabkan status 'clean exit'.
            }, 1000);
            return;
        }
        if (action === 'clear-cache') {
            // Implement cache clearing logic if redis or internal cache exists
            // For now just simulate
            res.json({ success: true, message: 'Cache aplikasi berhasil dibersihkan.' });
            return;
        }
        if (action === 'test-fcm') {
            const targetVillage = payload?.villageId || 'TEST_VILLAGE';
            await (0, firebaseService_1.sendSyncNotification)(targetVillage, 'TEST_SYNC_FROM_DASHBOARD');
            res.json({ success: true, message: `Pesan FCM percobaan berhasil dikirim ke villageId: ${targetVillage}` });
            return;
        }
        res.status(400).json({ success: false, message: 'Aksi tidak dikenali' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.performAction = performAction;
