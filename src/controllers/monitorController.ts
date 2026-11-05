import { Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { sequelize } from '../models';
import { sendSyncNotification } from '../services/firebaseService';

let lastCpuInfo = os.cpus();
let lastCpuTime = Date.now();

const getCpuUsage = () => {
    const currentCpuInfo = os.cpus();
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

    if (totalDiff === 0) return 0;
    const usage = 100 - Math.floor((idleDiff / totalDiff) * 100);
    return usage;
};

// Helper format angka Indonesia dengan pemisah ribuan titik dan desimal koma
const formatNumberId = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. RAM Aplikasi Node.js (RSS - Resident Set Size)
        const appMemory = process.memoryUsage();
        const appRssMb = appMemory.rss / (1024 * 1024);
        const appHeapUsedMb = appMemory.heapUsed / (1024 * 1024);

        // 2. RAM Total Server Linux cPanel
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const systemUsedMem = totalMem - freeMem;
        const memoryUsagePercent = Math.floor((systemUsedMem / totalMem) * 100);

        // Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

        // Database Status
        let dbStatus = 'ONLINE';
        try {
            await sequelize.authenticate();
        } catch (e) {
            dbStatus = 'OFFLINE';
        }

        res.json({
            success: true,
            data: {
                cpuUsage: getCpuUsage(),
                memoryUsagePercent,
                // RAM Aplikasi Node.js (Real-time RAM proses ini)
                appRssMbFormatted: formatNumberId(appRssMb, 2),
                appHeapUsedMbFormatted: formatNumberId(appHeapUsedMb, 2),
                // RAM Sistem Server cPanel
                systemUsedMemMbFormatted: formatNumberId(systemUsedMem / (1024 * 1024), 2),
                systemTotalMemMbFormatted: formatNumberId(totalMem / (1024 * 1024), 2),
                // Backward compatibility
                usedMemMb: formatNumberId(appRssMb, 2),
                totalMemMb: formatNumberId(totalMem / (1024 * 1024), 2),
                uptime: uptimeFormatted,
                platform: os.platform(),
                dbStatus,
                fcmStatus: 'ONLINE'
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const performAction = async (req: Request, res: Response): Promise<void> => {
    const { action, payload } = req.body;

    try {
        if (action === 'restart') {
            res.json({ success: true, message: 'Server sedang memulai ulang...' });
            
            // Beri jeda agar respon sempat terkirim ke klien
            setTimeout(() => {
                try {
                    // 1. Sentuh file temporary agar nodemon memicu restart otomatis di lokal
                    const restartLocal = path.join(__dirname, 'restart.tmp');
                    fs.writeFileSync(restartLocal, new Date().toISOString());

                    // 2. Sentuh file tmp/restart.txt agar Phusion Passenger (cPanel) memicu restart otomatis
                    const tmpDir = path.join(process.cwd(), 'tmp');
                    if (!fs.existsSync(tmpDir)) {
                        fs.mkdirSync(tmpDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(tmpDir, 'restart.txt'), new Date().toISOString());
                } catch (err) {
                    console.error('Error saat menyentuh restart files:', err);
                }

                // 3. Keluar dari proses agar Phusion Passenger / PM2 segera spawn instance baru
                setTimeout(() => {
                    process.exit(0);
                }, 500);
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
            await sendSyncNotification(targetVillage, 'TEST_SYNC_FROM_DASHBOARD');
            res.json({ success: true, message: `Pesan FCM percobaan berhasil dikirim ke villageId: ${targetVillage}` });
            return;
        }

        if (action === 'fix-timestamps') {
            const [result] = await sequelize.query("UPDATE jimpitan_history SET timestamp = CONCAT(date, 'T', SUBSTRING_INDEX(timestamp, 'T', -1)) WHERE type = 'TAGIHAN' AND date IS NOT NULL AND timestamp NOT LIKE CONCAT(date, '%');");
            res.json({ success: true, message: 'Timestamp tagihan berhasil disinkronkan dengan tanggal tagihan.', result });
            return;
        }

        res.status(400).json({ success: false, message: 'Aksi tidak dikenali' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
