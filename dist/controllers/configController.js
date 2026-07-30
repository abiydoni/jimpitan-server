"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppVersion = void 0;
/**
 * Konfigurasi versi aplikasi.
 *
 * Ketika rilis versi baru ke Play Store:
 *  1. Update `latestVersion` ke versi terbaru
 *  2. Jika ingin paksa update, naikkan `minVersion` dan set `forceUpdate: true`
 *  3. Deploy ulang server — semua user akan langsung mendapat notifikasi
 */
const APP_VERSION_CONFIG = {
    latestVersion: '1.9.3', // Versi terbaru di Play Store
    minVersion: '1.0.0', // Versi minimum yang masih boleh dipakai
    forceUpdate: false, // true = user WAJIB update, tidak bisa skip
    updateUrl: 'https://play.google.com/store/apps/details?id=jimpitan.appsbee.my.id',
    releaseNotes: 'Perbaikan bug dan peningkatan performa.',
};
/**
 * GET /api/config/version
 * Endpoint publik — tidak perlu auth, dipanggil saat app dibuka.
 */
const getAppVersion = (req, res) => {
    res.json({
        success: true,
        data: APP_VERSION_CONFIG,
    });
};
exports.getAppVersion = getAppVersion;
