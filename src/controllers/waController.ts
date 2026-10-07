import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User, Village, SystemSetting, WaBlastHistory, ChatMessage } from '../models';
import { 
  getWhatsAppConfig, 
  sendSingleWhatsApp, 
  normalizePhoneNumber, 
  isValidWaNumber, 
  renderTemplate, 
  sleep, 
  DEFAULT_WA_TEMPLATES,
  WaTemplate
} from '../services/whatsappService';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * GET /api/wa/recipients
 * Ambil daftar Kepala Keluarga (KK) & Warga untuk target WhatsApp Blasting
 */
export const getRecipients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId, onlyKk } = req.query;
    const filterOnlyKk = onlyKk !== 'false';

    const whereClause: any = {
      status: { [Op.ne]: 'INACTIVE' } // Abaikan warga yang dinonaktifkan
    };

    if (villageId && villageId !== 'ALL' && villageId !== '') {
      whereClause.villageId = villageId;
    }

    const allUsers = await User.findAll({
      where: whereClause,
      attributes: [
        'uid', 'name', 'phoneNumber', 'noKK', 'statusHubungan', 
        'alamat', 'villageId', 'familyId', 'nik'
      ],
      order: [['name', 'ASC']]
    });

    // Ambil info nama-nama desa
    const villages = await Village.findAll({
      attributes: ['id', 'name']
    });
    const villageNameMap = new Map<string, string>();
    villages.forEach(v => villageNameMap.set((v as any).id, (v as any).name));

    // Filter Kepala Keluarga
    // Prioritas 1: statusHubungan === 'Kepala Keluarga'
    // Prioritas 2: Jika per No KK belum ada yang statusHubungan 'Kepala Keluarga', ambil representasi pertama dari noKK tersebut
    let recipients: any[] = [];

    if (filterOnlyKk) {
      const kkSet = new Set<string>();
      const fallbackKkMap = new Map<string, any>();

      allUsers.forEach(u => {
        const uJson = u.toJSON() as any;
        const sh = (uJson.statusHubungan || '').trim().toLowerCase();
        const noKk = (uJson.noKK || uJson.familyId || uJson.uid).trim();

        if (sh === 'kepala keluarga') {
          kkSet.add(uJson.uid);
          recipients.push(uJson);
        } else {
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
    } else {
      recipients = allUsers.map(u => u.toJSON());
    }

    // Format data dan status validitas nomor WhatsApp
    let validWaCount = 0;
    let missingWaCount = 0;

    const formattedList = recipients.map(r => {
      const rawPhone = r.phoneNumber || '';
      const formatted = normalizePhoneNumber(rawPhone);
      const valid = isValidWaNumber(formatted);

      if (valid) validWaCount++;
      else missingWaCount++;

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wa/settings
 * Ambil konfigurasi WhatsApp Gateway & daftar template
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await getWhatsAppConfig();
    
    // Ambil template kustom dari DB jika ada
    const templateSetting = await SystemSetting.findOne({ where: { key: 'WA_TEMPLATES' } });
    let templates: WaTemplate[] = DEFAULT_WA_TEMPLATES;
    
    if (templateSetting && (templateSetting as any).value) {
      try {
        const parsed = JSON.parse((templateSetting as any).value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          templates = parsed;
        }
      } catch {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/wa/settings
 * Simpan konfigurasi WhatsApp Gateway & template
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, apiKey, apiUrl, senderNumber, delaySec, templates } = req.body;

    const entries: [string, string, string][] = [
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
      const [setting, created] = await SystemSetting.findOrCreate({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wa/test
 * Kirim pesan uji coba ke nomor tester
 */
export const testSend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetPhone, message, customConfig } = req.body;

    if (!targetPhone) {
      res.status(400).json({ success: false, message: 'Nomor tujuan wajib diisi' });
      return;
    }

    const testMsg = message || 'Halo! Ini adalah pesan uji coba integrasi WhatsApp Blasting dari Aplikasi Jimpitan. Koneksi Gateway BERHASIL terhubung!';
    const result = await sendSingleWhatsApp(targetPhone, testMsg, customConfig);

    if (result.success) {
      res.json({
        success: true,
        message: 'Pesan uji coba berhasil terkirim ke ' + normalizePhoneNumber(targetPhone),
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Gagal mengirim pesan uji coba: ' + result.error,
        error: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wa/blast
 * Kirim blasting massal ke daftar KK / Warga
 */
export const sendBlast = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      villageId,
      title,
      messageTemplate,
      eventDetails,
      targetFilter,
      recipientUids
    } = req.body;

    if (!title || !messageTemplate) {
      res.status(400).json({ success: false, message: 'Judul acara dan template pesan wajib diisi' });
      return;
    }

    // Ambil konfigurasi WhatsApp
    const config = await getWhatsAppConfig();
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
      const v = await Village.findByPk(villageId);
      if (v) villageName = (v as any).name || villageName;
    }

    // Query daftar penerima
    let queryWhere: any = {
      status: { [Op.ne]: 'INACTIVE' }
    };
    if (villageId && villageId !== 'ALL' && villageId !== '') {
      queryWhere.villageId = villageId;
    }
    if (recipientUids && Array.isArray(recipientUids) && recipientUids.length > 0) {
      queryWhere.uid = recipientUids;
    }

    const targetUsers = await User.findAll({
      where: queryWhere,
      attributes: ['uid', 'name', 'phoneNumber', 'noKK', 'statusHubungan', 'alamat', 'villageId']
    });

    if (targetUsers.length === 0) {
      res.status(400).json({ success: false, message: 'Tidak ada target penerima yang ditemukan.' });
      return;
    }

    const event = eventDetails || {};
    const delayMs = Math.max(1000, (config.delaySec || 2) * 1000);

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    const userObj = (req as AuthRequest).firebaseUser;
    const sentBy = userObj?.email || userObj?.uid || 'Admin';

    // Proses pengiriman berurutan dengan delay aman
    for (let i = 0; i < targetUsers.length; i++) {
      const user = targetUsers[i].toJSON() as any;
      const phone = normalizePhoneNumber(user.phoneNumber);

      if (!isValidWaNumber(phone)) {
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
      const personalizedMessage = renderTemplate(messageTemplate, {
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
      const sendRes = await sendSingleWhatsApp(phone, personalizedMessage, config);

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
      } else {
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
        await sleep(delayMs);
      }
    }

    // Opsi: Kirim juga 1 copy ke WhatsApp Group Warga jika diisi (misal: ...@g.us)
    const { targetGroupWa, copyToGroupChat } = req.body;
    if (targetGroupWa && String(targetGroupWa).trim().length > 0) {
      const groupPhone = String(targetGroupWa).trim();
      const groupMessage = renderTemplate(messageTemplate, {
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
      const groupRes = await sendSingleWhatsApp(groupPhone, groupMessage, config);
      if (groupRes.success) {
        results.push({
          uid: 'WA_GROUP',
          name: `WhatsApp Group (${groupPhone})`,
          noKK: '-',
          phone: groupPhone,
          status: 'SUCCESS',
          messageId: groupRes.messageId
        });
      } else {
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
        const inAppMessage = renderTemplate(messageTemplate, {
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
        await ChatMessage.create({
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
        } catch {}
      } catch (chatErr) {
        console.error('Gagal menyimpan salinan ke Chat Group Aplikasi:', chatErr);
      }
    }

    // Simpan ke riwayat blasting WaBlastHistory
    const historyRecord = await WaBlastHistory.create({
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
        id: (historyRecord as any).id,
        total: targetUsers.length,
        successCount,
        failedCount,
        details: results
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wa/history
 * Ambil daftar riwayat blasting yang pernah dikirim
 */
export const getBlastHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId, limit } = req.query;
    const whereClause: any = {};
    if (villageId && villageId !== 'ALL' && villageId !== '') {
      whereClause.villageId = villageId;
    }

    const list = await WaBlastHistory.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(String(limit || '50'), 10) || 50
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/wa/history/:id
 * Hapus log riwayat blasting
 */
export const deleteBlastHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await WaBlastHistory.findByPk(id as string);
    if (!history) {
      res.status(404).json({ success: false, message: 'Riwayat tidak ditemukan' });
      return;
    }
    await history.destroy();
    res.json({ success: true, message: 'Riwayat berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
