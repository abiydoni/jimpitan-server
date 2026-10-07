"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlastHistory = exports.getBlastHistory = exports.sendBlast = exports.testSend = exports.updateSettings = exports.getSettings = exports.getRecipients = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const whatsappService_1 = require("../services/whatsappService");
/**
 * GET /api/wa/recipients
 * Ambil daftar Kepala Keluarga (KK) & Warga untuk target WhatsApp Blasting
 */
const getRecipients = async (req, res) => {
    try {
        const { villageId, onlyKk } = req.query;
        const filterOnlyKk = onlyKk !== 'false';
        const whereClause = {
            status: { [sequelize_1.Op.ne]: 'INACTIVE' } // Abaikan warga yang dinonaktifkan
        };
        if (villageId && villageId !== 'ALL' && villageId !== '') {
            whereClause.villageId = villageId;
        }
        const allUsers = await models_1.User.findAll({
            where: whereClause,
            attributes: [
                'uid', 'name', 'phoneNumber', 'noKK', 'statusHubungan',
                'alamat', 'villageId', 'familyId', 'nik'
            ],
            order: [['name', 'ASC']]
        });
        // Ambil info nama-nama desa
        const villages = await models_1.Village.findAll({
            attributes: ['id', 'name']
        });
        const villageNameMap = new Map();
        villages.forEach(v => villageNameMap.set(v.id, v.name));
        // Filter Kepala Keluarga
        // Prioritas 1: statusHubungan === 'Kepala Keluarga'
        // Prioritas 2: Jika per No KK belum ada yang statusHubungan 'Kepala Keluarga', ambil representasi pertama dari noKK tersebut
        let recipients = [];
        if (filterOnlyKk) {
            const kkSet = new Set();
            const fallbackKkMap = new Map();
            allUsers.forEach(u => {
                const uJson = u.toJSON();
                const sh = (uJson.statusHubungan || '').trim().toLowerCase();
                const noKk = (uJson.noKK || uJson.familyId || uJson.uid).trim();
                if (sh === 'kepala keluarga') {
                    kkSet.add(uJson.uid);
                    recipients.push(uJson);
                }
                else {
                    if (!fallbackKkMap.has(noKk)) {
                        fallbackKkMap.set(noKk, uJson);
                    }
                }
            });
            // Untuk noKK yang belum punya Kepala Keluarga eksplisit, masukkan 1 perwakilan
            for (const [noKk, candidate] of fallbackKkMap.entries()) {
                const alreadyHasKk = recipients.some(r => (r.noKK || r.familyId || r.uid).trim() === noKk);
                if (!alreadyHasKk) {
                    recipients.push(candidate);
                }
            }
        }
        else {
            recipients = allUsers.map(u => u.toJSON());
        }
        // Format data dan status validitas nomor WhatsApp
        let validWaCount = 0;
        let missingWaCount = 0;
        const formattedList = recipients.map(r => {
            const rawPhone = r.phoneNumber || '';
            const formatted = (0, whatsappService_1.normalizePhoneNumber)(rawPhone);
            const valid = (0, whatsappService_1.isValidWaNumber)(formatted);
            if (valid)
                validWaCount++;
            else
                missingWaCount++;
            return {
                uid: r.uid,
                name: r.name || 'Tanpa Nama',
                noKK: r.noKK || '-',
                phoneNumber: rawPhone,
                formattedPhone: formatted,
                isValidWa: valid,
                statusHubungan: r.statusHubungan || 'Kepala Keluarga',
                alamat: r.alamat || '-',
                villageId: r.villageId || '',
                villageName: villageNameMap.get(r.villageId) || r.villageId || '-'
            };
        });
        res.json({
            success: true,
            totalKK: formattedList.length,
            validWaCount,
            missingWaCount,
            data: formattedList
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRecipients = getRecipients;
/**
 * GET /api/wa/settings
 * Ambil konfigurasi WhatsApp Gateway & daftar template
 */
const getSettings = async (req, res) => {
    try {
        const config = await (0, whatsappService_1.getWhatsAppConfig)();
        // Ambil template kustom dari DB jika ada
        const templateSetting = await models_1.SystemSetting.findOne({ where: { key: 'WA_TEMPLATES' } });
        let templates = whatsappService_1.DEFAULT_WA_TEMPLATES;
        if (templateSetting && templateSetting.value) {
            try {
                const parsed = JSON.parse(templateSetting.value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    templates = parsed;
                }
            }
            catch {
                // Fallback ke default
            }
        }
        res.json({
            success: true,
            data: {
                provider: config.provider,
                apiKey: config.apiKey,
                apiUrl: config.apiUrl,
                senderNumber: config.senderNumber,
                delaySec: config.delaySec,
                templates
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSettings = getSettings;
/**
 * PUT /api/wa/settings
 * Simpan konfigurasi WhatsApp Gateway & template
 */
const updateSettings = async (req, res) => {
    try {
        const { provider, apiKey, apiUrl, senderNumber, delaySec, templates } = req.body;
        const entries = [
            ['WA_GATEWAY_PROVIDER', String(provider || 'fonnte').toLowerCase(), 'Provider WhatsApp Gateway'],
            ['WA_API_KEY', String(apiKey || '').trim(), 'API Token / Key WhatsApp Gateway'],
            ['WA_API_URL', String(apiUrl || '').trim(), 'Custom Endpoint URL WhatsApp Gateway'],
            ['WA_SENDER_NUMBER', String(senderNumber || '').trim(), 'Nomor Pengirim / Device ID WhatsApp'],
            ['WA_DEFAULT_DELAY_SEC', String(delaySec || '2'), 'Jeda Pengiriman per Pesan (detik)']
        ];
        if (templates && Array.isArray(templates)) {
            entries.push([
                'WA_TEMPLATES',
                JSON.stringify(templates),
                'Template Pesan WhatsApp Blasting'
            ]);
        }
        for (const [key, value, description] of entries) {
            const [setting, created] = await models_1.SystemSetting.findOrCreate({
                where: { key },
                defaults: { key, value, description }
            });
            if (!created) {
                await setting.update({ value, description });
            }
        }
        res.json({
            success: true,
            message: 'Pengaturan WhatsApp Gateway berhasil disimpan'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSettings = updateSettings;
/**
 * POST /api/wa/test
 * Kirim pesan uji coba ke nomor tester
 */
const testSend = async (req, res) => {
    try {
        const { targetPhone, message, customConfig } = req.body;
        if (!targetPhone) {
            res.status(400).json({ success: false, message: 'Nomor tujuan wajib diisi' });
            return;
        }
        const testMsg = message || 'Halo! Ini adalah pesan uji coba integrasi WhatsApp Blasting dari Aplikasi Jimpitan. Koneksi Gateway BERHASIL terhubung!';
        const result = await (0, whatsappService_1.sendSingleWhatsApp)(targetPhone, testMsg, customConfig);
        if (result.success) {
            res.json({
                success: true,
                message: 'Pesan uji coba berhasil terkirim ke ' + (0, whatsappService_1.normalizePhoneNumber)(targetPhone),
                data: result
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Gagal mengirim pesan uji coba: ' + result.error,
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.testSend = testSend;
/**
 * POST /api/wa/blast
 * Kirim blasting massal ke daftar KK / Warga
 */
const sendBlast = async (req, res) => {
    try {
        const { villageId, title, messageTemplate, eventDetails, targetFilter, recipientUids } = req.body;
        if (!title || !messageTemplate) {
            res.status(400).json({ success: false, message: 'Judul acara dan template pesan wajib diisi' });
            return;
        }
        // Ambil konfigurasi WhatsApp
        const config = await (0, whatsappService_1.getWhatsAppConfig)();
        if (!config.apiKey && config.provider !== 'generic') {
            res.status(400).json({
                success: false,
                message: 'WhatsApp Gateway belum dikonfigurasi. Harap isi API Key di tab Pengaturan.'
            });
            return;
        }
        // Ambil nama desa jika ada
        let villageName = 'Warga';
        if (villageId && villageId !== 'ALL') {
            const v = await models_1.Village.findByPk(villageId);
            if (v)
                villageName = v.name || villageName;
        }
        // Query daftar penerima
        let queryWhere = {
            status: { [sequelize_1.Op.ne]: 'INACTIVE' }
        };
        if (villageId && villageId !== 'ALL' && villageId !== '') {
            queryWhere.villageId = villageId;
        }
        if (recipientUids && Array.isArray(recipientUids) && recipientUids.length > 0) {
            queryWhere.uid = recipientUids;
        }
        const targetUsers = await models_1.User.findAll({
            where: queryWhere,
            attributes: ['uid', 'name', 'phoneNumber', 'noKK', 'statusHubungan', 'alamat', 'villageId']
        });
        if (targetUsers.length === 0) {
            res.status(400).json({ success: false, message: 'Tidak ada target penerima yang ditemukan.' });
            return;
        }
        const event = eventDetails || {};
        const delayMs = Math.max(1000, (config.delaySec || 2) * 1000);
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        const userObj = req.firebaseUser;
        const sentBy = userObj?.email || userObj?.uid || 'Admin';
        // Proses pengiriman berurutan dengan delay aman
        for (let i = 0; i < targetUsers.length; i++) {
            const user = targetUsers[i].toJSON();
            const phone = (0, whatsappService_1.normalizePhoneNumber)(user.phoneNumber);
            if (!(0, whatsappService_1.isValidWaNumber)(phone)) {
                failedCount++;
                results.push({
                    uid: user.uid,
                    name: user.name || 'Tanpa Nama',
                    noKK: user.noKK || '-',
                    phone: user.phoneNumber || '-',
                    status: 'FAILED',
                    error: 'Nomor WhatsApp tidak valid atau kosong'
                });
                continue;
            }
            // Render variabel pesan
            const personalizedMessage = (0, whatsappService_1.renderTemplate)(messageTemplate, {
                nama: user.name || 'Warga',
                no_kk: user.noKK || '-',
                alamat: user.alamat || '-',
                desa: villageName,
                acara: event.acara || title,
                tanggal: event.tanggal || '-',
                jam: event.jam || '-',
                tempat: event.tempat || '-',
                catatan: event.catatan || '-',
                link: event.link || ''
            });
            // Kirim via gateway
            const sendRes = await (0, whatsappService_1.sendSingleWhatsApp)(phone, personalizedMessage, config);
            if (sendRes.success) {
                successCount++;
                results.push({
                    uid: user.uid,
                    name: user.name || 'Tanpa Nama',
                    noKK: user.noKK || '-',
                    phone,
                    status: 'SUCCESS',
                    messageId: sendRes.messageId
                });
            }
            else {
                failedCount++;
                results.push({
                    uid: user.uid,
                    name: user.name || 'Tanpa Nama',
                    noKK: user.noKK || '-',
                    phone,
                    status: 'FAILED',
                    error: sendRes.error
                });
            }
            // Beri jeda delay antar pengiriman (kecuali pesan terakhir)
            if (i < targetUsers.length - 1) {
                await (0, whatsappService_1.sleep)(delayMs);
            }
        }
        // Opsi: Kirim juga 1 copy ke WhatsApp Group Warga jika diisi (misal: ...@g.us)
        const { targetGroupWa, copyToGroupChat } = req.body;
        if (targetGroupWa && String(targetGroupWa).trim().length > 0) {
            const groupPhone = String(targetGroupWa).trim();
            const groupMessage = (0, whatsappService_1.renderTemplate)(messageTemplate, {
                nama: 'Seluruh Warga & Kepala Keluarga',
                no_kk: '-',
                alamat: '-',
                desa: villageName,
                acara: event.acara || title,
                tanggal: event.tanggal || '-',
                jam: event.jam || '-',
                tempat: event.tempat || '-',
                catatan: event.catatan || '-',
                link: event.link || ''
            });
            const groupRes = await (0, whatsappService_1.sendSingleWhatsApp)(groupPhone, groupMessage, config);
            if (groupRes.success) {
                results.push({
                    uid: 'WA_GROUP',
                    name: `WhatsApp Group (${groupPhone})`,
                    noKK: '-',
                    phone: groupPhone,
                    status: 'SUCCESS',
                    messageId: groupRes.messageId
                });
            }
            else {
                results.push({
                    uid: 'WA_GROUP',
                    name: `WhatsApp Group (${groupPhone})`,
                    noKK: '-',
                    phone: groupPhone,
                    status: 'FAILED',
                    error: groupRes.error
                });
            }
        }
        // Opsi: Kirim ke Chat Grup Aplikasi Jimpitan (In-App Chat Warga)
        if (copyToGroupChat && villageId && villageId !== 'ALL') {
            try {
                const inAppMessage = (0, whatsappService_1.renderTemplate)(messageTemplate, {
                    nama: 'Bapak/Ibu Kepala Keluarga & Warga',
                    no_kk: '-',
                    alamat: '-',
                    desa: villageName,
                    acara: event.acara || title,
                    tanggal: event.tanggal || '-',
                    jam: event.jam || '-',
                    tempat: event.tempat || '-',
                    catatan: event.catatan || '-',
                    link: event.link || ''
                });
                const roomId = `GROUP_${villageId}`;
                const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                await models_1.ChatMessage.create({
                    id: msgId,
                    roomId,
                    senderUid: 'SYSTEM',
                    senderName: 'Pengurus RT / Desa',
                    receiverUid: null,
                    message: inAppMessage,
                    isRead: false,
                    villageId
                });
                // Trigger FCM sync notification
                try {
                    const { sendSyncNotification } = require('../services/firebaseService');
                    await sendSyncNotification(villageId, 'REFRESH_CHAT');
                }
                catch { }
            }
            catch (chatErr) {
                console.error('Gagal menyimpan salinan ke Chat Group Aplikasi:', chatErr);
            }
        }
        // Simpan ke riwayat blasting WaBlastHistory
        const historyRecord = await models_1.WaBlastHistory.create({
            villageId: villageId || null,
            title,
            message: messageTemplate,
            targetFilter: targetFilter || 'ALL_KK',
            totalTarget: targetUsers.length,
            successCount,
            failedCount,
            details: results,
            sentBy
        });
        res.json({
            success: true,
            message: `Blasting selesai! Berhasil: ${successCount}, Gagal: ${failedCount}`,
            data: {
                id: historyRecord.id,
                total: targetUsers.length,
                successCount,
                failedCount,
                details: results
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendBlast = sendBlast;
/**
 * GET /api/wa/history
 * Ambil daftar riwayat blasting yang pernah dikirim
 */
const getBlastHistory = async (req, res) => {
    try {
        const { villageId, limit } = req.query;
        const whereClause = {};
        if (villageId && villageId !== 'ALL' && villageId !== '') {
            whereClause.villageId = villageId;
        }
        const list = await models_1.WaBlastHistory.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: parseInt(String(limit || '50'), 10) || 50
        });
        res.json({ success: true, data: list });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBlastHistory = getBlastHistory;
/**
 * DELETE /api/wa/history/:id
 * Hapus log riwayat blasting
 */
const deleteBlastHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await models_1.WaBlastHistory.findByPk(id);
        if (!history) {
            res.status(404).json({ success: false, message: 'Riwayat tidak ditemukan' });
            return;
        }
        await history.destroy();
        res.json({ success: true, message: 'Riwayat berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteBlastHistory = deleteBlastHistory;
