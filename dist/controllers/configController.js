"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReviewerCredentials = exports.updateAppVersion = exports.getAppVersion = void 0;
const models_1 = require("../models");
/**
 * GET /api/config/version
 * Endpoint publik — tidak perlu auth, dipanggil saat app dibuka.
 */
const getAppVersion = async (req, res) => {
    try {
        const keys = [
            'latestVersion', 'minVersion', 'forceUpdate', 'updateUrl', 'updateUrlLegacy',
            'releaseNotes', 'showNotification', 'showUpdateNotification',
            'reviewerEmail', 'reviewerPassword'
        ];
        const settings = await models_1.SystemSetting.findAll({ where: { key: keys } });
        // Convert array to object
        const config = {};
        settings.forEach((s) => {
            config[s.key] = s.value;
        });
        const showNotif = config.showNotification !== undefined
            ? (config.showNotification === 'true' || config.showNotification === '1')
            : (config.showUpdateNotification !== undefined
                ? (config.showUpdateNotification === 'true' || config.showUpdateNotification === '1')
                : true);
        let updateUrl = config.updateUrl || 'https://play.google.com/store/apps/details?id=jimpitan.appsbee.my.id';
        if (!updateUrl || updateUrl.includes('com.appsbeem.jimpitan')) {
            updateUrl = 'https://play.google.com/store/apps/details?id=jimpitan.appsbee.my.id';
        }
        // Hanya berikan password penguji jika pemanggil adalah admin terautentikasi
        let isAuthorized = false;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split('Bearer ')[1];
                const { getAuth } = await Promise.resolve().then(() => __importStar(require('firebase-admin/auth')));
                const decoded = await getAuth().verifyIdToken(token);
                if (decoded)
                    isAuthorized = true;
            }
            catch (_) { }
        }
        // Default values if missing (TIDAK ADA default kredensial penguji, murni dari tabel database)
        const data = {
            latestVersion: config.latestVersion || '1.10.2',
            minVersion: config.minVersion || '1.0.0',
            forceUpdate: config.forceUpdate === 'true' || config.forceUpdate === '1',
            updateUrl: updateUrl,
            updateUrlLegacy: config.updateUrlLegacy || '',
            releaseNotes: config.releaseNotes || 'Perbaikan bug dan peningkatan performa.',
            showNotification: showNotif,
            showUpdateNotification: showNotif,
            reviewerEmail: config.reviewerEmail || '',
        };
        if (isAuthorized) {
            data.reviewerPassword = config.reviewerPassword || '';
        }
        res.json({
            success: true,
            data: data,
        });
    }
    catch (error) {
        console.error('Error fetching version config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAppVersion = getAppVersion;
/**
 * PUT /api/config/version
 * Endpoint untuk admin mengupdate versi aplikasi
 */
const updateAppVersion = async (req, res) => {
    try {
        const { latestVersion, minVersion, forceUpdate, updateUrl, updateUrlLegacy, releaseNotes, showNotification, showUpdateNotification, reviewerEmail, reviewerPassword } = req.body;
        const notifVal = showNotification !== undefined ? showNotification : showUpdateNotification;
        const updates = [
            { key: 'latestVersion', value: latestVersion },
            { key: 'minVersion', value: minVersion },
            { key: 'forceUpdate', value: forceUpdate !== undefined ? (forceUpdate ? 'true' : 'false') : undefined },
            { key: 'updateUrl', value: updateUrl },
            { key: 'updateUrlLegacy', value: updateUrlLegacy },
            { key: 'releaseNotes', value: releaseNotes },
            { key: 'showNotification', value: notifVal !== undefined ? (notifVal ? 'true' : 'false') : undefined },
            { key: 'showUpdateNotification', value: notifVal !== undefined ? (notifVal ? 'true' : 'false') : undefined },
            { key: 'reviewerEmail', value: reviewerEmail ? String(reviewerEmail).trim() : undefined },
            { key: 'reviewerPassword', value: reviewerPassword ? String(reviewerPassword).trim() : undefined },
        ];
        for (const item of updates) {
            if (item.value !== undefined) {
                // Upsert setting
                const [setting, created] = await models_1.SystemSetting.findOrCreate({
                    where: { key: item.key },
                    defaults: { value: String(item.value) }
                });
                if (!created) {
                    await setting.update({ value: String(item.value) });
                }
            }
        }
        // Sinkronkan password ke Firebase Auth jika email dan password penguji diisi
        if (reviewerEmail && reviewerPassword) {
            try {
                const { getAuth } = await Promise.resolve().then(() => __importStar(require('firebase-admin/auth')));
                const auth = getAuth();
                const trimmedEmail = String(reviewerEmail).trim();
                const trimmedPass = String(reviewerPassword).trim();
                try {
                    const userRec = await auth.getUserByEmail(trimmedEmail);
                    await auth.updateUser(userRec.uid, { password: trimmedPass });
                }
                catch (uErr) {
                    if (uErr.code === 'auth/user-not-found') {
                        await auth.createUser({ email: trimmedEmail, password: trimmedPass });
                    }
                }
            }
            catch (fbErr) {
                console.warn('Firebase Auth reviewer password sync warning:', fbErr);
            }
        }
        res.json({ success: true, message: 'Konfigurasi versi dan akun penguji berhasil diperbarui' });
    }
    catch (error) {
        console.error('Error updating version config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateAppVersion = updateAppVersion;
/**
 * POST /api/config/reviewer-verify
 * Endpoint aman untuk memverifikasi kredensial akun penguji Google Play langsung dari tabel database (system_settings)
 */
const verifyReviewerCredentials = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email dan password penguji tidak boleh kosong'
            });
        }
        const emailSetting = await models_1.SystemSetting.findOne({ where: { key: 'reviewerEmail' } });
        const passSetting = await models_1.SystemSetting.findOne({ where: { key: 'reviewerPassword' } });
        const dbEmail = emailSetting?.value ? String(emailSetting.value).trim() : '';
        const dbPass = passSetting?.value ? String(passSetting.value).trim() : '';
        if (!dbEmail || !dbPass) {
            return res.status(403).json({
                success: false,
                message: 'Akun penguji belum dikonfigurasi di tabel pengaturan sistem (system_settings).'
            });
        }
        if (dbEmail.toLowerCase() !== String(email).trim().toLowerCase() || dbPass !== String(password).trim()) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password penguji tidak cocok dengan data di sistem.'
            });
        }
        res.json({
            success: true,
            message: 'Kredensial penguji berhasil diverifikasi dari tabel sistem'
        });
    }
    catch (error) {
        console.error('Error verifying reviewer credentials:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.verifyReviewerCredentials = verifyReviewerCredentials;
