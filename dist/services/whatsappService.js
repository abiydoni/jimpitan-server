"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSingleWhatsApp = exports.sleep = exports.renderTemplate = exports.getWhatsAppConfig = exports.isValidWaNumber = exports.normalizePhoneNumber = exports.DEFAULT_WA_TEMPLATES = void 0;
const models_1 = require("../models");
exports.DEFAULT_WA_TEMPLATES = [
    {
        id: 'tpl_rapat_rutin',
        title: 'Undangan Rapat Rutin RT/RW',
        category: 'RAPAT',
        content: `*UNDANGAN RAPAT RUTIN WARGA*
Kepada Yth.
Bapak/Ibu: *{nama}*
(Kepala Keluarga - No. KK: {no_kk})
Di Tempat

Dengan hormat,
Mengharap kehadiran Bapak/Ibu dalam agenda rapat koordinasi rutin warga Desa/Lingkungan *{desa}* yang akan diselenggarakan pada:

📅 *Hari/Tanggal:* {tanggal}
⏰ *Waktu:* {jam} WIB
📍 *Tempat:* {tempat}
📝 *Agenda Acara:* {acara}
💬 *Catatan:* {catatan}

Kehadiran dan partisipasi aktif Bapak/Ibu sangat berarti demi kemajuan dan kerukunan lingkungan kita bersama.

Atas perhatian dan kehadirannya, kami ucapkan terima kasih.

Hormat Kami,
*Pengurus Lingkungan {desa}*`
    },
    {
        id: 'tpl_kerja_bakti',
        title: 'Undangan Kerja Bakti / Gotong Royong',
        category: 'ACARA',
        content: `*PEMBERITAHUAN KERJA BAKTI WARGA*
Yth. Bapak/Ibu: *{nama}* ({alamat})

Dalam rangka menjaga kebersihan, kesehatan, dan keasrian lingkungan *{desa}*, kami mengundang seluruh warga untuk mengikuti kegiatan kerja bakti:

🧹 *Kegiatan:* {acara}
📅 *Hari/Tanggal:* {tanggal}
⏰ *Waktu:* {jam} WIB
📍 *Titik Kumpul:* {tempat}
🛠 *Perlengkapan:* {catatan}

Mari kita budayakan semangat gotong royong dan kebersamaan demi lingkungan yang nyaman.

Terima kasih atas partisipasi dan kepedulian seluruh warga.

Salam Guyub Rukun,
*Pengurus Lingkungan {desa}*`
    },
    {
        id: 'tpl_pengumuman_iuran',
        title: 'Pengumuman / Pengingat Iuran Warga',
        category: 'IURAN',
        content: `*PEMBERITAHUAN IURAN & JIMPITAN WARGA*
Yth. Bapak/Ibu: *{nama}*
Kepala Keluarga - No. KK: {no_kk}
Alamat: {alamat}

Pemberitahuan resmi dari Pengurus Desa/RT *{desa}*:

📌 *Perihal:* {acara}
📅 *Periode / Batas Waktu:* {tanggal}
ℹ️ *Keterangan:* {catatan}

Konfirmasi pembayaran atau pengecekan rincian iuran dapat dilakukan melalui aplikasi Jimpitan atau langsung menghubungi bendahara / petugas jimpitan terkait.

Terima kasih atas kepatuhan dan dukungan Bapak/Ibu demi kelancaran kegiatan warga.

Hormat Kami,
*Bendahara & Pengurus {desa}*`
    },
    {
        id: 'tpl_pengajian_doa',
        title: 'Undangan Pengajian / Doa Bersama',
        category: 'ACARA',
        content: `*UNDANGAN DOA BERSAMA & PENGAJIAN*
Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu: *{nama}* sekeluarga

Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu sekalian untuk hadir dalam kegiatan:

📖 *Acara:* {acara}
📅 *Hari/Tanggal:* {tanggal}
⏰ *Waktu:* {jam} WIB
📍 *Tempat:* {tempat}
ℹ️ *Keterangan:* {catatan}

Semoga kehadiran kita semua menjadi amal kebaikan dan mempererat tali silaturahmi antar warga.

Wassalamu'alaikum Wr. Wb.
*Pengurus Lingkungan {desa}*`
    },
    {
        id: 'tpl_kustom',
        title: 'Pesan Bebas / Khusus',
        category: 'UMUM',
        content: `Yth. Bapak/Ibu: *{nama}*
No. KK: {no_kk} - Desa {desa}

*PENGUMUMAN PENTING:*
{acara}

Tanggal: {tanggal}
Waktu: {jam} WIB
Lokasi: {tempat}

{catatan}

Terima kasih.
*Pengurus {desa}*`
    }
];
/**
 * Normalisasi nomor telepon ke format internasional (misal: 6281234567890)
 * Jika nomor berupa JID WhatsApp Group (misal: ...@g.us), dipertahankan apa adanya.
 */
const normalizePhoneNumber = (phone) => {
    if (!phone)
        return '';
    const trimmed = String(phone).trim();
    // Pertahankan JID WhatsApp Group atau format JID lengkap
    if (trimmed.includes('@g.us') || trimmed.includes('@s.whatsapp.net') || trimmed.includes('@c.us')) {
        return trimmed;
    }
    let cleaned = trimmed.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
};
exports.normalizePhoneNumber = normalizePhoneNumber;
/**
 * Validasi apakah nomor HP valid untuk WhatsApp Indonesia atau WhatsApp Group
 */
const isValidWaNumber = (phone) => {
    if (!phone)
        return false;
    const trimmed = String(phone).trim();
    if (trimmed.includes('@g.us') || trimmed.includes('@s.whatsapp.net') || trimmed.includes('@c.us')) {
        return true;
    }
    const norm = (0, exports.normalizePhoneNumber)(trimmed);
    return /^62\d{8,14}$/.test(norm);
};
exports.isValidWaNumber = isValidWaNumber;
/**
 * Mengambil konfigurasi WhatsApp Gateway dari database system_settings
 * Default menggunakan gateway Appsbee WA (seperti di telebot/auto_jimpitan)
 */
const getWhatsAppConfig = async () => {
    const settings = await models_1.SystemSetting.findAll({
        where: {
            key: [
                'WA_GATEWAY_PROVIDER',
                'WA_API_KEY',
                'WA_API_URL',
                'WA_SENDER_NUMBER',
                'WA_DEFAULT_DELAY_SEC'
            ]
        }
    });
    const map = {};
    settings.forEach(s => {
        map[s.key] = s.value || '';
    });
    return {
        provider: (map['WA_GATEWAY_PROVIDER'] || 'appsbee').toLowerCase(),
        apiKey: map['WA_API_KEY'] || 'wa-69aa3dbf930020c93f34b83add6374e8',
        apiUrl: map['WA_API_URL'] || 'https://wa-ab.appsbee.my.id/api/send-message',
        senderNumber: map['WA_SENDER_NUMBER'] || 'appsbee', // sessionId di Appsbee WA
        delaySec: parseInt(map['WA_DEFAULT_DELAY_SEC'] || '2', 10) || 2,
    };
};
exports.getWhatsAppConfig = getWhatsAppConfig;
/**
 * Render template pesan dengan variabel dinamis
 */
const renderTemplate = (template, vars) => {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        result = result.replace(regex, value ?? '');
    }
    return result;
};
exports.renderTemplate = renderTemplate;
/**
 * Jeda waktu eksekusi (milidetik)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
/**
 * Kirim 1 pesan WhatsApp melalui Gateway Provider (Default: Appsbee WA)
 */
const sendSingleWhatsApp = async (targetPhone, message, customConfig) => {
    const activeConfig = {
        ...(await (0, exports.getWhatsAppConfig)()),
        ...customConfig
    };
    const phone = (0, exports.normalizePhoneNumber)(targetPhone);
    if (!(0, exports.isValidWaNumber)(phone)) {
        return {
            success: false,
            error: `Nomor telepon tidak valid atau kosong: ${targetPhone || '-'}`
        };
    }
    if (!activeConfig.apiKey && activeConfig.provider !== 'generic') {
        return {
            success: false,
            error: 'API Key WhatsApp Gateway belum dikonfigurasi di Pengaturan'
        };
    }
    const provider = (activeConfig.provider || 'appsbee').toLowerCase();
    try {
        let url = '';
        let headers = { 'Content-Type': 'application/json' };
        let body = {};
        switch (provider) {
            // 1. Appsbee WA (Sesuai telebot/auto_jimpitan)
            case 'appsbee': {
                url = activeConfig.apiUrl || 'https://wa-ab.appsbee.my.id/api/send-message';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': activeConfig.apiKey || 'wa-69aa3dbf930020c93f34b83add6374e8'
                };
                body = {
                    sessionId: activeConfig.senderNumber || 'appsbee',
                    number: phone,
                    message: message
                };
                break;
            }
            // 2. Fonnte
            case 'fonnte': {
                url = activeConfig.apiUrl || 'https://api.fonnte.com/send';
                headers = {
                    'Authorization': activeConfig.apiKey,
                    'Content-Type': 'application/json'
                };
                body = {
                    target: phone,
                    message: message,
                    countryCode: '62'
                };
                break;
            }
            // 3. Wablas
            case 'wablas': {
                url = activeConfig.apiUrl || 'https://phone.wablas.com/api/send-message';
                headers = {
                    'Authorization': activeConfig.apiKey,
                    'Content-Type': 'application/json'
                };
                body = {
                    phone: phone,
                    message: message
                };
                break;
            }
            // 4. Starsender
            case 'starsender': {
                url = activeConfig.apiUrl || 'https://starsender.online/api/sendText';
                headers = {
                    'apikey': activeConfig.apiKey,
                    'Content-Type': 'application/json'
                };
                body = {
                    to: phone,
                    message: message
                };
                break;
            }
            // 5. Whacenter
            case 'whacenter': {
                url = activeConfig.apiUrl || 'https://app.whacenter.com/api/send';
                headers = {
                    'Content-Type': 'application/json'
                };
                body = {
                    device_id: activeConfig.senderNumber || activeConfig.apiKey,
                    number: phone,
                    message: message
                };
                break;
            }
            // 6. Generic REST API
            case 'generic':
            default: {
                url = activeConfig.apiUrl || 'https://wa-ab.appsbee.my.id/api/send-message';
                headers = {
                    'Authorization': activeConfig.apiKey ? `Bearer ${activeConfig.apiKey}` : '',
                    'Content-Type': 'application/json'
                };
                body = {
                    to: phone,
                    target: phone,
                    phone: phone,
                    message: message
                };
                break;
            }
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const responseText = await response.text();
        let responseData = {};
        try {
            responseData = JSON.parse(responseText);
        }
        catch {
            responseData = { raw: responseText };
        }
        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${responseData.message || responseData.reason || responseText || 'Gagal mengirim pesan'}`,
                rawResponse: responseData
            };
        }
        // Periksa status spesifik tiap gateway
        if (provider === 'appsbee') {
            if (responseData.status === false) {
                return {
                    success: false,
                    error: responseData.message || 'Appsbee WA menolak pengiriman',
                    rawResponse: responseData
                };
            }
        }
        else if (provider === 'fonnte') {
            if (responseData.status === false) {
                return {
                    success: false,
                    error: responseData.reason || responseData.message || 'Fonnte menolak pengiriman',
                    rawResponse: responseData
                };
            }
        }
        else if (provider === 'wablas') {
            if (responseData.status === false) {
                return {
                    success: false,
                    error: responseData.message || 'Wablas menolak pengiriman',
                    rawResponse: responseData
                };
            }
        }
        return {
            success: true,
            messageId: responseData.id || responseData.jid || responseData.message_id || `msg_${Date.now()}`,
            rawResponse: responseData
        };
    }
    catch (error) {
        return {
            success: false,
            error: error?.message || 'Gagal terhubung ke server WhatsApp Gateway'
        };
    }
};
exports.sendSingleWhatsApp = sendSingleWhatsApp;
